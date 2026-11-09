/**
 * <Rain> — instanced rain streaks + optional ground splashes. One draw call each, all motion computed in the vertex
 * shader from `time` (s): drops fall through `area` [w,h,d] (origin = BASE CENTRE, rain from y=0 to y=h), wrap
 * seamlessly, slant with `wind`. Additive: tint with the dominant light (sodium lamps -> '#ffcf8a', cop lights...).
 *
 * Props (+ group props)
 *   time: number (s)   count?: 1800   seed?: 1   area?: [14, 9, 14]   speed?: 9 (m/s)   wind?: [x, z] m/s = [-0.8, 0]
 *   length?: 0.45 (m, streak length)   width?: 0.007 (m)   color?: '#cfe6ff'   intensity?: 0.9
 *   splashes?: number = count/10 (0 = none)   splashColor?: = color   splashSize?: 0.1 (m)
 *
 * Usage
 *   <Rain time={t} area={[16, 10, 16]} color="#ffd9a0" />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {rand} from '../../time';
import {streakInstances, quadInstances, streakUniforms, fxAtlas, GLSL_STREAK_VERT, GLSL_STREAK_FRAG, GLSL_ATLAS, GLSL_HASH, GroupProps, ATLAS} from './shared';

const VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uArea;
uniform float uSpeed;
uniform vec2 uWind;
uniform float uLen;
uniform float uWidth;
attribute vec3 iBase;
attribute float iVar;
varying float vA;
${GLSL_STREAK_VERT}
void main() {
  float sp = uSpeed * (0.8 + 0.4 * iVar);
  vec3 vel = vec3(uWind.x, -sp, uWind.y);
  float H = uArea.y;
  float y = mod(iBase.y * H - uTime * sp, H);
  float x = mod(iBase.x * uArea.x + uWind.x * uTime + uArea.x * 0.5, uArea.x) - uArea.x * 0.5;
  float z = mod(iBase.z * uArea.z + uWind.y * uTime + uArea.z * 0.5, uArea.z) - uArea.z * 0.5;
  vec3 head = vec3(x, y, z);
  vec3 tail = head - normalize(vel) * uLen * (0.7 + 0.6 * iVar);
  vA = smoothstep(0.0, 0.06 * H, y) * (1.0 - smoothstep(0.85 * H, H, y)) * (0.55 + 0.45 * iVar);
  gl_Position = streakPosition(head, tail, uWidth);
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying float vA;
${GLSL_STREAK_FRAG}
void main() {
  float m = streakMask(0.25);
  gl_FragColor = vec4(uColor * m * vA * uIntensity, 1.0);
}`;

const SPLASH_VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uArea;
uniform float uSize;
attribute float iSeed;
varying vec2 vUv;
varying float vA;
${GLSL_HASH}
void main() {
  float rate = 1.6 + hash11(iSeed * 3.7) * 1.4;
  float ph = uTime * rate + hash11(iSeed * 9.1);
  float cyc = floor(ph);
  float t = fract(ph);
  vec2 xz = vec2(hash12(vec2(iSeed, cyc)) - 0.5, hash12(vec2(cyc, iSeed + 17.0)) - 0.5) * uArea.xz;
  float s = uSize * (0.25 + 0.75 * t);
  vec3 p = vec3(xz.x + position.x * s, 0.01, xz.y - position.y * s);
  vUv = uv;
  vA = (1.0 - t) * (1.0 - t);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const SPLASH_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying float vA;
${GLSL_ATLAS}
void main() {
  float m = texture2D(uTex, atlasUv(vUv, ${ATLAS.ring.toFixed(1)})).r;
  gl_FragColor = vec4(uColor * m * vA * uIntensity, 1.0);
}`;

export type RainProps = GroupProps & {
  time: number;
  count?: number;
  seed?: number | string;
  area?: [number, number, number];
  speed?: number;
  wind?: [number, number];
  length?: number;
  width?: number;
  color?: string;
  intensity?: number;
  splashes?: number;
  splashColor?: string;
  splashSize?: number;
};

export const Rain: React.FC<RainProps> = ({
  time, count = 1800, seed = 1, area = [14, 9, 14], speed = 9, wind = [-0.8, 0], length = 0.45, width = 0.007, color = '#cfe6ff',
  intensity = 0.9, splashes, splashColor, splashSize = 0.1, ...group
}) => {
  const nSplash = splashes ?? Math.round(count / 10);
  const {size: vp} = useThree();
  const geo = useMemo(() => {
    const B = new Float32Array(count * 3), V = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = (k: string) => rand(`rain|${seed}|${i}|${k}`);
      B.set([r('x'), r('y'), r('z')], i * 3);
      V[i] = r('v');
    }
    return streakInstances(count, {iBase: [3, B], iVar: [1, V]});
  }, [count, seed]);
  const sgeo = useMemo(() => {
    const S = new Float32Array(Math.max(1, nSplash));
    for (let i = 0; i < S.length; i++) S[i] = i + 1 + (typeof seed === 'number' ? seed : 0) * 101;
    return quadInstances(nSplash, {iSeed: [1, S]});
  }, [nSplash, seed]);
  useLayoutEffect(() => () => {
    geo.dispose();
    sgeo.dispose();
  }, [geo, sgeo]);
  const mats = useMemo(() => {
    const rain = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0}, uArea: {value: new THREE.Vector3()}, uSpeed: {value: 9}, uWind: {value: new THREE.Vector2()}, uLen: {value: 0.45},
        uWidth: {value: 0.007}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}, ...streakUniforms(),
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
    });
    const splash = new THREE.ShaderMaterial({
      uniforms: {uTime: {value: 0}, uArea: {value: new THREE.Vector3()}, uSize: {value: 0.12}, uTex: {value: fxAtlas()}, uColor: {value: new THREE.Color()}, uIntensity: {value: 1}},
      vertexShader: SPLASH_VERT, fragmentShader: SPLASH_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
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
    u.uViewH.value = vp.height;
    u.uMinPx.value = 1.1;
    const s = mats.splash.uniforms;
    s.uTime.value = time;
    s.uArea.value.set(...area);
    s.uSize.value = splashSize;
    s.uColor.value.set(splashColor ?? color);
    s.uIntensity.value = intensity * 0.45;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mats.rain} frustumCulled={false} renderOrder={6} />
      {nSplash > 0 ? <mesh geometry={sgeo} material={mats.splash} frustumCulled={false} renderOrder={6} /> : null}
    </group>
  );
};
