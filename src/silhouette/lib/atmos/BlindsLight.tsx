/**
 * Slatted light from VERTICAL blinds (DESIGN-silhouette §2.3, V1Bedroom's key light): bars of light separated by the
 * soft shadows of the slats, inside the soft-edged projection of the window, with a red TENURE scanner band that can
 * slide across THROUGH the same slats.
 *
 * <BlindsLight> — the pattern projected on a wall (or floor). A decal plane facing +Z, ORIGIN AT ITS CENTRE; place it
 *   1–2 cm in front of the wall, or rotation-x={-Math.PI/2} on the floor. Additive, fog-free.
 *
 *   <BlindsLight width?={3.2} height?={2.4} slats?={9} gap?={0.42} angle?={0.12} softness?={0.14} offset?={0}
 *                edge?={0.18} color?={S.bone} intensity?={0.95} scan?={null} scanColor?={S.authRed}
 *                scanWidth?={0.14} scanIntensity?={1.6} time?={0} seed?={1} {...group}/>
 *
 *   slats      number of light bars across the width (one per gap between slats)
 *   gap        0..1 fraction of each period that is LIT (the opening between two slats); 0.42 = blinds half open
 *   angle      skew of the bars (rad): the light comes in from the side, so the bars lean (0 = vertical)
 *   softness   penumbra, fraction of a period (0.05 crisp … 0.3 very soft / far from the window)
 *   offset     slides the bars sideways, in periods (animate it slowly for a passing light source / swaying blinds)
 *   edge       soft border of the window projection (m)
 *   intensity  HDR multiplier; 0.95 keeps bone bars JUST under bloom (the wall is a big surface: don't bloom it).
 *   scan       null = off, else 0..1 position of the red scanner band across the width (animate 0 → 1).
 *              Inside the band the white light is REPLACED by red (never mixed into pink). The band passes through the
 *              same slats, plus a faint unmasked spill.
 *
 * <BlindShafts> — the same pattern as VOLUMETRIC shafts in the air: N additive slices (one draw call) stacked from the
 *   window along `direction`, each carrying the bar pattern, softening and fading with distance. Viewed from inside the
 *   room toward the window the slices parallax into striped beams. Origin = the window centre; the window lies in the
 *   local XY plane; light travels along `direction` (default into the room toward +Z and slightly down).
 *
 *   <BlindShafts width?={3.2} height?={2.4} slats?={9} gap?={0.42} angle?={0.12} softness?={0.14} offset?={0}
 *                direction?={[0.25, -0.3, 1]} length?={5} slices?={24} color?={S.bone} intensity?={0.5}
 *                scan?={null} scanColor?={S.authRed} scanWidth?={0.14} scanIntensity?={1.6} {...group}/>
 *
 *   Use the SAME slats/gap/angle/offset/scan as the BlindsLight on the wall so beams and stripes agree.
 *   intensity is per-stack (it is divided over the slices); 0.4–0.8 typical. Beams may glow slightly.
 *
 * Usage (V1Bedroom: window on the left wall at x = −3, light falling onto the back wall)
 *   <BlindShafts position={[-3, 1.6, 0]} rotation-y={Math.PI / 2} direction={[0.3, -0.25, 1]} length={4} scan={s}/>
 *   <BlindsLight position={[0.5, 1.5, -2.99]} width={3.4} height={2.2} scan={s}/>
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {atmosNoise, GroupProps, V3} from './shared';

type BlindsCommon = {
  width?: number;
  height?: number;
  slats?: number;
  gap?: number;
  angle?: number;
  softness?: number;
  offset?: number;
  color?: string;
  intensity?: number;
  scan?: number | null;
  scanColor?: string;
  scanWidth?: number;
  scanIntensity?: number;
  seed?: number;
  renderOrder?: number;
};

export type BlindsLightProps = GroupProps & BlindsCommon & {edge?: number; time?: number};
export type BlindShaftsProps = GroupProps & BlindsCommon & {direction?: V3; length?: number; slices?: number};

/** GLSL: bar mask at window uv (0..1), with per-slat brightness variation; and the red scan band weight. */
const GLSL_BLINDS = /* glsl */ `
uniform vec2 uSize;
uniform float uSlats, uGap, uSkew, uSoft, uOffset, uSeed;
uniform float uScan, uScanW;
float blHash(float n) { return fract(sin(n * 91.3458 + uSeed * 7.13) * 47453.5453); }
float blindsMask(vec2 uv, float extraSoft) {
  float x = uv.x + (uv.y - 0.5) * uSkew * uSize.y / uSize.x;
  float q = x * uSlats + uOffset;
  float ph = fract(q);
  float id = floor(q);
  float dd = abs(ph - 0.5);
  float s = clamp(uSoft + extraSoft, 0.01, 0.5);
  float bar = 1.0 - smoothstep(uGap * 0.5 - s * 0.5, uGap * 0.5 + s * 0.5, dd);
  return bar * (0.82 + 0.18 * blHash(id));
}
float scanBand(vec2 uv) {
  if (uScan < -0.5) return 0.0;
  float x = uv.x + (uv.y - 0.5) * uSkew * uSize.y / uSize.x;
  float sd = (x - uScan) / max(uScanW, 1e-3);
  return exp(-sd * sd * 3.0);
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const WALL_FRAG = /* glsl */ `
uniform vec3 uColor, uScanColor;
uniform float uEdge, uTime;
uniform sampler2D uNoise;
varying vec2 vUv;
${GLSL_BLINDS}
void main() {
  vec2 m = (vUv - 0.5) * uSize;
  vec2 q = uSize * 0.5 - abs(m);
  float win = smoothstep(0.0, uEdge, q.x) * smoothstep(0.0, uEdge, q.y);
  float bars = blindsMask(vUv, 0.0);
  float n = texture2D(uNoise, m / 2.5 + vec2(uTime * 0.01, 0.0)).r;
  float grad = mix(1.0, 0.72, vUv.x) * mix(0.85, 1.12, n);
  float band = scanBand(vUv);
  vec3 col = uColor * bars * grad * (1.0 - 0.9 * band) + uScanColor * band * (bars * 0.9 + 0.12);
  gl_FragColor = vec4(col * win, 1.0);
}`;

const SHAFT_VERT = /* glsl */ `
attribute vec3 aSlice; // x = s (0..1 along length), y,z unused
uniform vec3 uDir;
uniform float uLen;
varying vec2 vUv;
varying float vS;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vS = aSlice.x;
  vec3 p = position + uDir * (aSlice.x * uLen);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor, uScanColor;
uniform float uSliceK;
varying vec2 vUv;
varying float vS;
varying vec3 vN;
varying vec3 vV;
${GLSL_BLINDS}
void main() {
  vec2 m = (vUv - 0.5) * uSize;
  vec2 q = uSize * 0.5 - abs(m);
  float e = 0.06 + 0.5 * vS;
  float win = smoothstep(0.0, e, q.x) * smoothstep(0.0, e, q.y);
  float bars = blindsMask(vUv, vS * 0.18);
  float along = smoothstep(0.0, 0.06, vS) * pow(1.0 - vS, 1.4);
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float grazing = smoothstep(0.05, 0.35, facing);
  float band = scanBand(vUv);
  vec3 col = uColor * bars * (1.0 - 0.9 * band) + uScanColor * band * bars;
  gl_FragColor = vec4(col * win * along * grazing * uSliceK, 1.0);
}`;

const UNIT = new THREE.PlaneGeometry(1, 1);

const blindsUniforms = () => ({
  uSize: {value: new THREE.Vector2(3, 2)}, uSlats: {value: 9}, uGap: {value: 0.42}, uSkew: {value: 0}, uSoft: {value: 0.14},
  uOffset: {value: 0}, uSeed: {value: 1}, uScan: {value: -1}, uScanW: {value: 0.14}, uColor: {value: new THREE.Color()},
  uScanColor: {value: new THREE.Color()},
});

const setBlinds = (u: Record<string, THREE.IUniform>, p: Required<Omit<BlindsCommon, 'renderOrder' | 'scan'>> & {scan: number | null}) => {
  u.uSize.value.set(p.width, p.height);
  u.uSlats.value = p.slats;
  u.uGap.value = p.gap;
  u.uSkew.value = Math.tan(p.angle);
  u.uSoft.value = p.softness;
  u.uOffset.value = p.offset;
  u.uSeed.value = p.seed;
  u.uScan.value = p.scan == null ? -1 : p.scan;
  u.uScanW.value = p.scanWidth;
  u.uColor.value.set(p.color).multiplyScalar(p.intensity);
  u.uScanColor.value.set(p.scanColor).multiplyScalar(p.scanIntensity);
};

const additiveMat = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...extra});

export const BlindsLight: React.FC<BlindsLightProps> = ({
  width = 3.2, height = 2.4, slats = 9, gap = 0.42, angle = 0.12, softness = 0.14, offset = 0, edge = 0.18, color = S.bone, intensity = 0.95,
  scan = null, scanColor = S.authRed, scanWidth = 0.14, scanIntensity = 1.6, time = 0, seed = 1, renderOrder = 2, ...group
}) => {
  const mat = useMemo(
    () =>
      additiveMat(VERT, WALL_FRAG, {...blindsUniforms(), uEdge: {value: 0.18}, uTime: {value: 0}, uNoise: {value: atmosNoise(1)}}, {
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    setBlinds(mat.uniforms, {width, height, slats, gap, angle, softness, offset, color, intensity, scan, scanColor, scanWidth, scanIntensity, seed});
    mat.uniforms.uEdge.value = edge;
    mat.uniforms.uTime.value = time;
  });
  return (
    <group {...group}>
      <mesh geometry={UNIT} material={mat} scale={[width, height, 1]} renderOrder={renderOrder} />
    </group>
  );
};

export const BlindShafts: React.FC<BlindShaftsProps> = ({
  width = 3.2, height = 2.4, slats = 9, gap = 0.42, angle = 0.12, softness = 0.14, offset = 0, direction = [0.25, -0.3, 1], length = 5,
  slices = 24, color = S.bone, intensity = 0.5, scan = null, scanColor = S.authRed, scanWidth = 0.14, scanIntensity = 1.6, seed = 1,
  renderOrder = 5, ...group
}) => {
  const n = Math.max(2, Math.round(slices));
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(width, height);
      const s = (i + 0.5) / n;
      g.setAttribute('aSlice', new THREE.Float32BufferAttribute(new Array(4).fill(0).flatMap(() => [s, 0, 0]), 3));
      parts.push(g);
    }
    // merge (one draw call; additive = order independent)
    const out = new THREE.BufferGeometry();
    const pos: number[] = [], uv: number[] = [], sl: number[] = [], idx: number[] = [];
    parts.forEach((g, k) => {
      const b = k * 4;
      pos.push(...(g.attributes.position.array as Float32Array));
      uv.push(...(g.attributes.uv.array as Float32Array));
      sl.push(...(g.attributes.aSlice.array as Float32Array));
      (g.index!.array as Uint16Array).forEach((v) => idx.push(v + b));
      g.dispose();
    });
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setAttribute('aSlice', new THREE.Float32BufferAttribute(sl, 3));
    out.setIndex(idx);
    return out;
  }, [n, width, height]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () => additiveMat(SHAFT_VERT, SHAFT_FRAG, {...blindsUniforms(), uDir: {value: new THREE.Vector3(0, 0, 1)}, uLen: {value: 5}, uSliceK: {value: 0.05}}, {side: THREE.DoubleSide}),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    setBlinds(mat.uniforms, {width, height, slats, gap, angle, softness, offset, color, intensity, scan, scanColor, scanWidth, scanIntensity, seed});
    const d = new THREE.Vector3(...direction);
    // keep the slices' spacing measured along the window normal: travel `length` metres along +Z
    d.multiplyScalar(1 / Math.max(0.05, Math.abs(d.z)));
    mat.uniforms.uDir.value.copy(d);
    mat.uniforms.uLen.value = length;
    mat.uniforms.uSliceK.value = 6 / n;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={renderOrder} frustumCulled={false} visible={intensity > 0} />
    </group>
  );
};
