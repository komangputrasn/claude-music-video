/**
 * <Starfield> — Y2K screen-saver stars. Two modes:
 *  - box (default): stars fill `area` [w,h,d] centred on the origin and FLY toward +Z at `speed` m/s (wrapping
 *    seamlessly, fading at both ends). With speed > 0 they stretch into warp streaks (`streak` seconds of motion trail).
 *    Put the camera inside the box near the +Z end, looking down -Z, for the classic "flying through space" shot.
 *  - shell: pass `shell={radius}` to scatter static stars on a sphere around the origin (night-sky backdrop).
 * Deterministic: positions from `seed`, motion/twinkle from `time` (s).
 *
 * Props (+ group props)
 *   count?: 1500   seed?: 1   time?: 0   speed?: 0 (m/s along +Z)   area?: [60, 34, 80]   shell?: number (radius)
 *   size?: 0.06 (m, star radius)   streak?: 0.08 (s of trail at speed)   intensity?: 1.6   twinkle?: 0.35
 *   colors?: css[] (mostly white with a few blue/pink/gold)
 *
 * Usage
 *   <Starfield count={2500} speed={30} time={t} />                 // warp
 *   <Starfield shell={120} count={1800} size={0.25} time={t} />    // static night sky
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {rand} from '../../time';
import {streakInstances, streakUniforms, GLSL_STREAK_VERT, GLSL_STREAK_FRAG, GroupProps} from './shared';
import {useThree} from '@react-three/fiber';

const DEFAULT_COLORS = ['#ffffff', '#ffffff', '#ffffff', '#dff4ff', '#bfe0ff', '#ffd6f2', '#fff0c8'];

const VERT = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uStreak;
uniform float uTwinkle;
uniform float uFly;
uniform vec3 uArea;
uniform float uSize;
attribute vec3 iBase;
attribute float iSize;
attribute vec3 iColor;
attribute float iPhase;
varying vec3 vCol;
varying float vA;
${GLSL_STREAK_VERT}
void main() {
  vec3 p = iBase;
  float D = uArea.z;
  float a = 1.0;
  if (uFly > 0.5) {
    p.z = mod(iBase.z + uTime * uSpeed + D * 0.5, D) - D * 0.5;
    a = smoothstep(-D * 0.5, -D * 0.5 + D * 0.25, p.z) * (1.0 - smoothstep(D * 0.5 - D * 0.06, D * 0.5, p.z));
  }
  vec3 tail = p - vec3(0.0, 0.0, uSpeed * uStreak * uFly);
  float tw = 0.5 + 0.5 * sin(uTime * (1.5 + iPhase * 3.0) + iPhase * 40.0);
  a *= mix(1.0, 0.35 + 0.65 * tw, uTwinkle);
  vCol = iColor;
  vA = a;
  gl_Position = streakPosition(p, tail, iSize * uSize);
}`;

const FRAG = /* glsl */ `
uniform float uIntensity;
varying vec3 vCol;
varying float vA;
${GLSL_STREAK_FRAG}
void main() {
  float m = streakMask(0.1);
  gl_FragColor = vec4(vCol * m * vA * uIntensity, 1.0);
}`;

export type StarfieldProps = GroupProps & {
  count?: number;
  seed?: number | string;
  time?: number;
  speed?: number;
  area?: [number, number, number];
  shell?: number;
  size?: number;
  streak?: number;
  intensity?: number;
  twinkle?: number;
  colors?: readonly string[];
};

export const Starfield: React.FC<StarfieldProps> = ({
  count = 1500, seed = 1, time = 0, speed = 0, area = [60, 34, 80], shell, size = 0.06, streak = 0.08, intensity = 1.6, twinkle = 0.35,
  colors = DEFAULT_COLORS, ...group
}) => {
  const geo = useMemo(() => {
    const B = new Float32Array(count * 3), S = new Float32Array(count), Co = new Float32Array(count * 3), Ph = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = (k: string) => rand(`star|${seed}|${i}|${k}`);
      if (shell) {
        const u = r('u') * 2 - 1, th = r('t') * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const R = shell * (0.92 + 0.16 * r('r'));
        B.set([Math.cos(th) * s * R, u * R, Math.sin(th) * s * R], i * 3);
      } else {
        B.set([(r('x') - 0.5) * area[0], (r('y') - 0.5) * area[1], (r('z') - 0.5) * area[2]], i * 3);
      }
      S[i] = 0.35 + 1.3 * Math.pow(r('s'), 3);
      c.set(colors[Math.floor(r('c') * colors.length)]);
      const k = 0.5 + 0.6 * r('b');
      Co.set([c.r * k, c.g * k, c.b * k], i * 3);
      Ph[i] = r('p');
    }
    return streakInstances(count, {iBase: [3, B], iSize: [1, S], iColor: [3, Co], iPhase: [1, Ph]});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed, area[0], area[1], area[2], shell, colors.join()]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: {value: 0}, uSpeed: {value: 0}, uStreak: {value: 0.08}, uTwinkle: {value: 0.35}, uFly: {value: 1},
          uArea: {value: new THREE.Vector3()}, uSize: {value: 0.06}, uIntensity: {value: 1.6}, ...streakUniforms(),
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const {size: vp} = useThree();
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uViewH.value = vp.height;
    u.uMinPx.value = 1.6;
    u.uTime.value = time;
    u.uSpeed.value = shell ? 0 : speed;
    u.uStreak.value = streak;
    u.uTwinkle.value = twinkle;
    u.uFly.value = shell ? 0 : 1;
    u.uArea.value.set(...area);
    u.uSize.value = size;
    u.uIntensity.value = intensity;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-2} />
    </group>
  );
};
