/**
 * <SilRain> — hard rain tuned for the silhouette look (DESIGN-silhouette §2.3, V2Rain / Chorus1 "Pancake in the rain").
 * Instanced velocity-stretched streaks (one draw call) + optional ground splashes (one draw call), all motion computed
 * in the vertex shader from `time`: deterministic, wraps seamlessly. Origin = BASE CENTRE of the rain box: drops fall
 * from y = area[1] to y = 0 inside x ∈ ±area[0]/2, z ∈ ±area[2]/2.
 *
 * Default blending 'mix' draws each streak as a translucent mid-grey line, so the SAME rain reads BRIGHT against dark
 * (void, ash architecture) and DARK-ish against bright backlights/screens — exactly how backlit rain reads in a
 * silhouette frame. 'additive' makes every streak glow (rain crossing a beam or in front of a red screen: tint it).
 * Far drops fade into the scene fog.
 *
 *   <SilRain time={t} area?={[16, 10, 16]} count?={2600} speed?={11} wind?={[-1.2, 0]} length?={0.7} width?={0.006}
 *            color?={GREYS.g7} intensity?={0.55} blending?={'mix'} splashes?={count / 16} splashSize?={0.09}
 *            splashColor?={GREYS.g8} seed?={1} {...group}/>
 *
 *   time       seconds (song time)                     speed  fall speed m/s (± 20 % per drop)
 *   wind       [x, z] m/s slant                        length streak length m (motion blur; 0.5–0.9 reads "hard")
 *   width      streak width m (never thinner than ~1.1 px; sub-pixel drops are dimmed, not aliased)
 *   color      streak colour. 'mix': a grey ~S.fog reads both ways; 'additive': the colour of the light it crosses.
 *   intensity  'mix': streak opacity (0.3–0.8); 'additive': brightness.
 *   splashes   number of ground splash slots (each re-fires ~2×/s at a new place); 0 = none. They are tiny expanding
 *              rings + a bright fleck on y = 0 (put the group on the ground).
 *
 * Usage
 *   <SilRain time={t} area={[20, 12, 18]} position={[0, 0, -2]} />
 *   <SilRain time={t} blending="additive" color={S.authRed} intensity={0.35} count={800} area={[4, 8, 4]} />  // in a red cone
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {GREYS} from '../palette';
import {rand} from '../../../lib/time';
import {streakInstances, quadInstances, streakUniforms, GLSL_STREAK_VERT, GLSL_STREAK_FRAG, GLSL_HASH} from '../../../lib/three/fx/shared';
import {GroupProps, withFog, GLSL_ATMOS_FOG} from './shared';

export type SilRainProps = GroupProps & {
  time: number;
  area?: [number, number, number];
  count?: number;
  speed?: number;
  wind?: [number, number];
  length?: number;
  width?: number;
  color?: string;
  intensity?: number;
  blending?: 'mix' | 'additive';
  splashes?: number;
  splashSize?: number;
  splashColor?: string;
  seed?: number;
  renderOrder?: number;
};

const VERT = /* glsl */ `
uniform float uTime, uSpeed, uLen, uWidth;
uniform vec3 uArea;
uniform vec2 uWind;
attribute vec3 iBase;
attribute float iVar;
varying float vA;
${GLSL_STREAK_VERT}
#include <fog_pars_vertex>
void main() {
  float sp = uSpeed * (0.8 + 0.4 * iVar);
  vec3 vel = vec3(uWind.x, -sp, uWind.y);
  float H = uArea.y;
  float y = mod(iBase.y * H - uTime * sp, H);
  float x = mod(iBase.x * uArea.x + uWind.x * uTime + uArea.x * 0.5, uArea.x) - uArea.x * 0.5;
  float z = mod(iBase.z * uArea.z + uWind.y * uTime + uArea.z * 0.5, uArea.z) - uArea.z * 0.5;
  vec3 head = vec3(x, y, z);
  vec3 tail = head - normalize(vel) * uLen * (0.7 + 0.6 * iVar);
  // fade in at the top, out at the ground and at the box sides (no popping when drops wrap)
  vec2 side = abs(vec2(x, z)) / (uArea.xz * 0.5);
  vA = smoothstep(0.0, 0.04 * H, y) * (1.0 - smoothstep(0.8 * H, H, y)) * (1.0 - smoothstep(0.85, 1.0, max(side.x, side.y)));
  vA *= 0.55 + 0.45 * iVar;
  gl_Position = streakPosition(head, tail, uWidth);
  vec4 mvPosition = modelViewMatrix * vec4(head, 1.0);
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity, uAdd;
varying float vA;
${GLSL_STREAK_FRAG}
#include <fog_pars_fragment>
${GLSL_ATMOS_FOG}
void main() {
  float m = streakMask(0.3) * vA;
  float f = atmosFogAmount();
  if (uAdd > 0.5) {
    gl_FragColor = vec4(uColor * m * uIntensity * (1.0 - f), 1.0);
  } else {
    gl_FragColor = vec4(uColor, clamp(m * uIntensity * (1.0 - 0.85 * f), 0.0, 1.0));
  }
}`;

const SPLASH_VERT = /* glsl */ `
uniform float uTime, uSize;
uniform vec3 uArea;
attribute float iSeed;
varying vec2 vUv;
varying float vT;
varying float vA;
${GLSL_HASH}
#include <fog_pars_vertex>
void main() {
  float rate = 1.5 + hash11(iSeed * 3.7) * 1.3;
  float ph = uTime * rate + hash11(iSeed * 9.1);
  float cyc = floor(ph);
  float t = fract(ph);
  vec2 xz = vec2(hash12(vec2(iSeed, cyc)) - 0.5, hash12(vec2(cyc, iSeed + 17.0)) - 0.5) * uArea.xz * 0.92;
  float s = uSize * (0.35 + 0.65 * sqrt(t)) * (0.6 + 0.8 * hash11(iSeed + cyc * 1.3));
  vec3 p = vec3(xz.x + position.x * s, 0.012, xz.y - position.y * s);
  vUv = uv;
  vT = t;
  vA = 1.0 - smoothstep(0.85, 1.0, max(abs(xz.x) / (uArea.x * 0.5), abs(xz.y) / (uArea.z * 0.5)));
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying float vT;
varying float vA;
#include <fog_pars_fragment>
${GLSL_ATMOS_FOG}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // no pow() on a possibly negative base (undefined in GLSL; NaN under ANGLE/D3D11 -> bloom blacks the frame)
  float dr = (r - 0.7) / 0.07;
  float ring = exp(-dr * dr) * (1.0 - vT) * (1.0 - vT) * (0.6 + 0.4 * sin(atan(p.y, p.x) * 7.0 + vT * 3.0));
  float fleck = exp(-r * r * 60.0) * pow(max(1.0 - vT, 0.0), 5.0) * 2.0;
  float m = (ring * 0.35 + fleck) * vA * (1.0 - smoothstep(0.92, 1.0, r));
  gl_FragColor = vec4(uColor * m * uIntensity * (1.0 - atmosFogAmount()), 1.0);
}`;

export const SilRain: React.FC<SilRainProps> = ({
  time, area = [16, 10, 16], count = 2600, speed = 11, wind = [-1.2, 0], length = 0.7, width = 0.006, color = GREYS.g7, intensity = 0.55,
  blending = 'mix', splashes, splashSize = 0.09, splashColor = GREYS.g8, seed = 1, renderOrder = 6, ...group
}) => {
  const nSplash = Math.max(0, Math.round(splashes ?? count / 16));
  const {size: vp} = useThree();
  const geo = useMemo(() => {
    const B = new Float32Array(count * 3), V = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = (k: string) => rand(`silrain|${seed}|${i}|${k}`);
      B.set([r('x'), r('y'), r('z')], i * 3);
      V[i] = r('v');
    }
    return streakInstances(count, {iBase: [3, B], iVar: [1, V]});
  }, [count, seed]);
  const sgeo = useMemo(() => {
    const A = new Float32Array(Math.max(1, nSplash));
    for (let i = 0; i < A.length; i++) A[i] = i + 1 + seed * 101;
    return quadInstances(nSplash, {iSeed: [1, A]});
  }, [nSplash, seed]);
  useLayoutEffect(() => () => {
    geo.dispose();
    sgeo.dispose();
  }, [geo, sgeo]);
  const mats = useMemo(() => {
    const rain = new THREE.ShaderMaterial({
      uniforms: withFog({
        uTime: {value: 0}, uArea: {value: new THREE.Vector3()}, uSpeed: {value: 11}, uWind: {value: new THREE.Vector2()}, uLen: {value: 0.7},
        uWidth: {value: 0.006}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}, uAdd: {value: 0}, ...streakUniforms(),
      }),
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    });
    const splash = new THREE.ShaderMaterial({
      uniforms: withFog({uTime: {value: 0}, uArea: {value: new THREE.Vector3()}, uSize: {value: 0.14}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}}),
      vertexShader: SPLASH_VERT, fragmentShader: SPLASH_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
      side: THREE.DoubleSide,
    });
    return {rain, splash};
  }, []);
  useLayoutEffect(() => () => {
    mats.rain.dispose();
    mats.splash.dispose();
  }, [mats]);
  useLayoutEffect(() => {
    const u = mats.rain.uniforms;
    u.uTime.value = time;
    u.uArea.value.set(...area);
    u.uSpeed.value = speed;
    u.uWind.value.set(wind[0], wind[1]);
    u.uLen.value = length;
    u.uWidth.value = width;
    u.uColor.value.set(color);
    u.uIntensity.value = intensity;
    u.uAdd.value = blending === 'additive' ? 1 : 0;
    u.uViewH.value = vp.height;
    u.uMinPx.value = 1.1;
    mats.rain.blending = blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
    const s = mats.splash.uniforms;
    s.uTime.value = time;
    s.uArea.value.set(...area);
    s.uSize.value = splashSize;
    s.uColor.value.set(splashColor);
    s.uIntensity.value = blending === 'additive' ? intensity : Math.min(1.0, intensity * 0.9);
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mats.rain} frustumCulled={false} renderOrder={renderOrder} visible={intensity > 0} />
      {nSplash > 0 ? <mesh geometry={sgeo} material={mats.splash} frustumCulled={false} renderOrder={renderOrder} visible={intensity > 0} /> : null}
    </group>
  );
};
