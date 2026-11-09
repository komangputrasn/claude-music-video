/**
 * <LaserLines> — hot thin light lines (authRed by default): laser cages, gate-edge strips, warning seams.
 * One draw call for any number of segments. Each segment is a screen-space ribbon at least `minPx` pixels wide at any
 * distance (no aliasing / vanishing far lines), with a soft halo, additive, depth-tested (architecture occludes it).
 *
 *   <LaserLines segments={[[a, b], [a, b, intensityMul], …]} color?={S.authRed} intensity?={1.6} width?={0.02}
 *               minPx?={1.6} halo?={3} time?={0} pulse?={0} pulseSpeed?={6} pulseSpacing?={9} fog?={0.6}
 *               opacity?={1} {...group}/>
 *
 *   segments     [start, end] (+ optional per-segment intensity multiplier) in the group's local space. Endpoints may
 *                change every frame (gate edges sliding) — the attribute buffers are rewritten in useLayoutEffect.
 *   width        physical core width in metres (lines never get thinner than minPx on screen).
 *   halo         quad half-width in units of the core half-width (the soft glow around the core).
 *   intensity    HDR multiplier of `color`. Keep authRed ≤ 2 (ACES turns hotter red orange = reads as gold).
 *   pulse        0..1 brightness of bright packets travelling along the lines (distance-based, from `time`).
 *   fog          0..1 how much the scene fog dims far lines.
 * Origin: the group's origin; lines are wherever their endpoints say. Lines are clipped at the camera near plane.
 * Determinism: pure function of props; no per-frame allocation once the capacity fits.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {S} from '../palette';
import type {GroupProps, V3} from './shared';

export type LaserSegment = [V3, V3] | [V3, V3, number];

const VERT = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute float aI;
uniform vec2 uRes;
uniform float uWidth, uMinPx, uHalo;
varying float vSide;
varying float vI;
varying float vAlong;
varying float vEnergy;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec4 a = modelViewMatrix * vec4(aA, 1.0);
  vec4 b = modelViewMatrix * vec4(aB, 1.0);
  float nearZ = -0.12;
  if (a.z > nearZ && b.z > nearZ) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (a.z > nearZ) a = mix(a, b, (a.z - nearZ) / (a.z - b.z));
  if (b.z > nearZ) b = mix(b, a, (b.z - nearZ) / (b.z - a.z));
  vec4 ca = projectionMatrix * a;
  vec4 cb = projectionMatrix * b;
  vec2 sa = ca.xy / ca.w * uRes * 0.5;
  vec2 sb = cb.xy / cb.w * uRes * 0.5;
  vec2 dir = sb - sa;
  float L = length(dir);
  dir = L > 1e-4 ? dir / L : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float t = position.x;
  float side = position.y;
  vec4 c = mix(ca, cb, t);
  vec4 mvPosition = mix(a, b, t);
  float depth = max(-mvPosition.z, 0.05);
  float px = uWidth * projectionMatrix[1][1] * 0.5 * uRes.y / depth;
  float w = max(px, uMinPx) * 0.5;
  vEnergy = clamp(px / uMinPx, 0.45, 1.0);
  float hw = w * uHalo;
  vec2 off = nrm * side * hw + dir * (t * 2.0 - 1.0) * hw;
  c.xy += off / (uRes * 0.5) * c.w;
  gl_Position = c;
  vSide = side * uHalo;
  vI = aI;
  vAlong = mix(0.0, length(aB - aA), t);
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime, uPulse, uPulseSpeed, uPulseSpacing, uFogAmt, uOpacity;
varying float vSide;
varying float vI;
varying float vAlong;
varying float vEnergy;
#include <common>
#include <fog_pars_fragment>
void main() {
  float s = abs(vSide);
  float core = 1.0 - smoothstep(0.55, 1.05, s);
  float halo = exp(-s * 1.6) * 0.32;
  float p = 1.0;
  if (uPulse > 0.0) {
    float ph = fract((vAlong - uTime * uPulseSpeed) / uPulseSpacing);
    p += uPulse * 1.2 * pow(smoothstep(0.75, 1.0, ph) * (1.0 - smoothstep(0.98, 1.0, ph)), 2.0);
  }
  float k = (core + halo) * vI * vEnergy * p * uOpacity;
  float fogK = 0.0;
  #ifdef USE_FOG
    fogK = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  k *= 1.0 - uFogAmt * fogK;
  if (k < 0.002) discard;
  gl_FragColor = vec4(uColor * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const quad = () => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
};

export type LaserLinesProps = GroupProps & {
  segments: LaserSegment[];
  color?: string;
  intensity?: number;
  width?: number;
  minPx?: number;
  halo?: number;
  time?: number;
  pulse?: number;
  pulseSpeed?: number;
  pulseSpacing?: number;
  fog?: number;
  opacity?: number;
  renderOrder?: number;
};

export const LaserLines: React.FC<LaserLinesProps> = ({
  segments, color = S.authRed, intensity = 1.6, width = 0.02, minPx = 1.6, halo = 3, time = 0, pulse = 0, pulseSpeed = 6,
  pulseSpacing = 9, fog = 0.6, opacity = 1, renderOrder = 5, ...group
}) => {
  const {size} = useThree();
  const cap = Math.max(8, 1 << Math.ceil(Math.log2(Math.max(1, segments.length))));
  const {geo, aA, aB, aI} = useMemo(() => {
    const g = quad();
    const A = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    const B = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    const I = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    A.setUsage(THREE.DynamicDrawUsage);
    B.setUsage(THREE.DynamicDrawUsage);
    I.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aA', A);
    g.setAttribute('aB', B);
    g.setAttribute('aI', I);
    return {geo: g, aA: A, aB: B, aI: I};
  }, [cap]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uRes: {value: new THREE.Vector2(1920, 1080)}, uWidth: {value: 0.02}, uMinPx: {value: 1.6}, uHalo: {value: 3},
            uColor: {value: new THREE.Color()}, uTime: {value: 0}, uPulse: {value: 0}, uPulseSpeed: {value: 6},
            uPulseSpacing: {value: 9}, uFogAmt: {value: 0.6}, uOpacity: {value: 1},
          },
        ]),
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    [],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const n = Math.min(segments.length, cap);
    const a = aA.array as Float32Array, b = aB.array as Float32Array, k = aI.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const s = segments[i];
      a[i * 3] = s[0][0]; a[i * 3 + 1] = s[0][1]; a[i * 3 + 2] = s[0][2];
      b[i * 3] = s[1][0]; b[i * 3 + 1] = s[1][1]; b[i * 3 + 2] = s[1][2];
      k[i] = s[2] ?? 1;
    }
    aA.needsUpdate = aB.needsUpdate = aI.needsUpdate = true;
    geo.instanceCount = n;
    const u = mat.uniforms;
    u.uRes.value.set(size.width, size.height);
    u.uWidth.value = width;
    u.uMinPx.value = minPx;
    u.uHalo.value = halo;
    u.uColor.value.set(color).multiplyScalar(intensity);
    u.uTime.value = time;
    u.uPulse.value = pulse;
    u.uPulseSpeed.value = pulseSpeed;
    u.uPulseSpacing.value = pulseSpacing;
    u.uFogAmt.value = fog;
    u.uOpacity.value = opacity;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
