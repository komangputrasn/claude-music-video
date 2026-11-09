/**
 * <Motes> — floating dust / ash particles (DESIGN-silhouette §2.3: dust in beams, drifting ash, the e-reader's words
 * "drifting off as ash"). Instanced camera-facing soft dots, ONE draw call for thousands; motion is a pure function of
 * `time` (constant drift + slow per-mote wander, wrapped seamlessly inside the box, faded at the box faces so nothing
 * pops). Origin = BASE CENTRE of the box: x ∈ ±area[0]/2, y ∈ [0, area[1]], z ∈ ±area[2]/2.
 *
 *   <Motes count?={600} area?={[10, 6, 10]} time?={0} color?={S.bone} size?={0.012} drift?={[0.03, 0.05, 0]}
 *          wander?={0.25} intensity?={1} twinkle?={0.6} blending?={'additive'} seed?={1} {...group}/>
 *
 *   count      number of motes                    size   diameter in metres (± 50 %; never below ~1.2 px, dimmed instead)
 *   drift      [x, y, z] m/s constant drift (ash rising: y > 0; ash falling: y < 0; wind: x)
 *   wander     m amplitude of each mote's slow wobble
 *   color      S.bone dust in light; GREYS.g5/S.ash flakes with blending 'normal' for dark ash against bright haze;
 *              authRed only for TENURE-lit dust (inside a red cone); dawnGold only Final/Outro.
 *   intensity  'additive': brightness (HDR, > ~1.2 makes the brightest motes bloom); 'normal': opacity.
 *   twinkle    0..1 how much motes flicker as they turn and catch the light.
 *   blending   'additive' (glowing dust, default) | 'normal' (opaque-ish flakes; dark ash).
 *   Far motes fade into the scene fog.
 *
 * Usage
 *   <Motes time={t} area={[3, 8, 3]} count={400} />                                  // dust in a window shaft
 *   <Motes time={t} area={[30, 14, 20]} count={2500} color={GREYS.g4} blending="normal" drift={[0.2, -0.15, 0]} size={0.03} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {S} from '../palette';
import {rand} from '../../../lib/time';
import {quadInstances} from '../../../lib/three/fx/shared';
import {GLSL_ATMOS_FOG, GLSL_BILLBOARD, GroupProps, withFog} from './shared';

export type MotesProps = GroupProps & {
  count?: number;
  area?: [number, number, number];
  time?: number;
  color?: string;
  size?: number;
  drift?: [number, number, number];
  wander?: number;
  intensity?: number;
  twinkle?: number;
  blending?: 'additive' | 'normal';
  seed?: number;
  renderOrder?: number;
};

const VERT = /* glsl */ `
uniform float uTime, uSize, uWander, uTwinkle;
uniform vec3 uArea, uDrift;
attribute vec4 iA; // base xyz (0..1), phase
varying vec2 vUv;
varying float vB;
${GLSL_BILLBOARD}
#include <fog_pars_vertex>
void main() {
  float ph = iA.w * 6.2831853;
  vec3 w = vec3(sin(uTime * 0.31 + ph * 3.0), sin(uTime * 0.23 + ph * 5.0), cos(uTime * 0.27 + ph * 7.0)) * uWander;
  vec3 p = iA.xyz * uArea + uDrift * uTime * (0.7 + 0.6 * iA.w) + w;
  p.x = mod(p.x, uArea.x) - uArea.x * 0.5;
  p.y = mod(p.y, uArea.y);
  p.z = mod(p.z, uArea.z) - uArea.z * 0.5;
  vec3 q = vec3(abs(p.x) / (uArea.x * 0.5), abs(p.y - uArea.y * 0.5) / (uArea.y * 0.5), abs(p.z) / (uArea.z * 0.5));
  float edge = 1.0 - smoothstep(0.82, 1.0, max(q.x, max(q.y, q.z)));
  float e, vd;
  vec4 mv = atmosBillboard(p, position.xy, uSize * (0.5 + iA.w), e, vd);
  vUv = uv;
  float tw = 0.5 + 0.5 * sin(uTime * (0.8 + 2.2 * fract(iA.w * 7.0)) + ph * 11.0);
  vB = e * edge * mix(1.0, tw * tw * 1.6, uTwinkle);
  vec4 mvPosition = mv;
  gl_Position = projectionMatrix * mv;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity, uAdd;
varying vec2 vUv;
varying float vB;
#include <fog_pars_fragment>
${GLSL_ATMOS_FOG}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d2 = dot(p, p);
  float m = exp(-d2 * 4.0) * (1.0 - smoothstep(0.6, 1.0, d2)) * vB;
  float f = atmosFogAmount();
  if (uAdd > 0.5) gl_FragColor = vec4(uColor * m * uIntensity * (1.0 - f), 1.0);
  else {
    vec3 c = uColor;
#ifdef USE_FOG
    c = mix(c, fogColor, f);
#endif
    gl_FragColor = vec4(c, clamp(m * uIntensity * 1.6, 0.0, 1.0));
  }
}`;

export const Motes: React.FC<MotesProps> = ({
  count = 600, area = [10, 6, 10], time = 0, color = S.bone, size = 0.012, drift = [0.03, 0.05, 0], wander = 0.25, intensity = 1,
  twinkle = 0.6, blending = 'additive', seed = 1, renderOrder = 7, ...group
}) => {
  const {size: vp} = useThree();
  const n = Math.max(0, Math.round(count));
  const geo = useMemo(() => {
    const A = new Float32Array(Math.max(1, n) * 4);
    for (let i = 0; i < n; i++) {
      const r = (k: string) => rand(`motes|${seed}|${i}|${k}`);
      A.set([r('x'), r('y'), r('z'), r('p')], i * 4);
    }
    return quadInstances(n, {iA: [4, A]});
  }, [n, seed]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: withFog({
          uTime: {value: 0}, uSize: {value: 0.012}, uWander: {value: 0.25}, uTwinkle: {value: 0.6}, uArea: {value: new THREE.Vector3()},
          uDrift: {value: new THREE.Vector3()}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}, uAdd: {value: 1},
          uViewH: {value: 1080}, uMinPx: {value: 1.2},
        }),
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uTime.value = time;
    u.uSize.value = size;
    u.uWander.value = wander;
    u.uTwinkle.value = twinkle;
    u.uArea.value.set(...area);
    u.uDrift.value.set(...drift);
    u.uColor.value.set(color);
    u.uIntensity.value = intensity;
    u.uAdd.value = blending === 'additive' ? 1 : 0;
    u.uViewH.value = vp.height;
    mat.blending = blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={renderOrder} visible={n > 0 && intensity > 0} />
    </group>
  );
};
