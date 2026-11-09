/**
 * Y2K 4-point star glints (the "sparkle GIF" look): camera-facing billboards with a hot core, long thin cross rays
 * and faint diagonals. Additive + HDR, so they bloom in <Stage>. Fully deterministic: twinkle and spin are pure
 * functions of the `time` prop (seconds). No useFrame, no Math.random.
 *
 * <Sparkle>  one glint. Props (+ group props except rotation):
 *   size?: number = 0.3 (m, full width)   intensity?: number = 2.5   rotation?: number (rad, in screen plane)
 *   color?: css = '#ffffff'   time?: number (s; enables twinkle)   twinkle?: 0..1 = 1 when time given
 *   speed?: twinkles per second = 0.8      depthTest?: boolean = true
 *
 * <SparkleField> many glints in one draw call. Props (+ group props):
 *   count?: 40   seed?: 1   time?: 0 (s)   area?: [w,h,d] = [6,3,2] box centred on the origin
 *   positions?: [x,y,z][] (overrides random placement, e.g. letter corners from measureChromeText)
 *   size?: 0.22 (m)   sizeVar?: 0.6 (0..1 random size spread)   colors?: css[] (default white/ice/aqua/pink/gold)
 *   intensity?: 2.5   twinkle?: 1 (0 = steady)   speed?: 0.7 (twinkles/s)   spin?: 0.6 (rad/s)   depthTest?: true
 *
 * Usage
 *   <Sparkle position={[1.2, 0.9, 0.3]} size={0.6} time={t} />
 *   <SparkleField count={60} seed={7} area={[8, 4, 3]} time={t} position={[0, 1.5, 0]} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {rand} from '../../time';
import {fxAtlas, quadInstances, GLSL_ATLAS, GroupProps, ATLAS} from './shared';

const DEFAULT_COLORS = ['#FFFFFF', '#FFFFFF', '#E6FBFF', '#BFF3FF', '#9FE6FF', '#FFC2EA', '#FFE9A0'];

const VERT = /* glsl */ `
uniform float uTime;
uniform float uTwinkle;
uniform float uSpin;
attribute vec3 iPos;
attribute float iSize;
attribute float iRot;
attribute float iPhase;
attribute float iSpeed;
attribute vec3 iColor;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
void main() {
  float ph = uTime * iSpeed + iPhase;
  float tw = 0.5 + 0.5 * sin(ph * 6.2831853);
  float k = mix(1.0, pow(tw, 3.0), uTwinkle);
  float ms = length(modelMatrix[0].xyz);
  float s = 0.5 * iSize * ms * (0.2 + 0.8 * k);
  float a = iRot + uSpin * (uTime + iPhase) * (iPhase > 0.5 ? 1.0 : -1.0);
  vec2 c = mat2(cos(a), sin(a), -sin(a), cos(a)) * position.xy;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  mv.xy += c * s;
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vCol = iColor;
  vA = k;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
${GLSL_ATLAS}
void main() {
  float m = texture2D(uTex, atlasUv(vUv, ${ATLAS.star.toFixed(1)})).r;
  vec3 col = mix(vCol, vec3(1.0), m * m) * m * vA * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}`;

const makeMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTex: {value: fxAtlas()},
      uTime: {value: 0},
      uTwinkle: {value: 1},
      uSpin: {value: 0.6},
      uIntensity: {value: 2.5},
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

type Inst = {pos: number[]; size: number; rot: number; phase: number; speed: number; color: string};
const buildGeo = (list: Inst[]) => {
  const n = list.length;
  const P = new Float32Array(n * 3), S = new Float32Array(n), R = new Float32Array(n), Ph = new Float32Array(n), Sp = new Float32Array(n), Co = new Float32Array(n * 3);
  const c = new THREE.Color();
  list.forEach((it, i) => {
    P.set(it.pos, i * 3);
    S[i] = it.size;
    R[i] = it.rot;
    Ph[i] = it.phase;
    Sp[i] = it.speed;
    c.set(it.color);
    Co.set([c.r, c.g, c.b], i * 3);
  });
  return quadInstances(n, {iPos: [3, P], iSize: [1, S], iRot: [1, R], iPhase: [1, Ph], iSpeed: [1, Sp], iColor: [3, Co]});
};

type Common = {intensity?: number; twinkle?: number; time?: number; spin?: number; depthTest?: boolean};
const useSparkleMat = ({intensity = 2.5, twinkle = 1, time = 0, spin = 0.6, depthTest = true}: Common) => {
  const mat = useMemo(makeMat, []);
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.uniforms.uTime.value = time;
    mat.uniforms.uTwinkle.value = twinkle;
    mat.uniforms.uSpin.value = spin;
    mat.uniforms.uIntensity.value = intensity;
    mat.depthTest = depthTest;
  });
  return mat;
};

export type SparkleProps = Omit<GroupProps, 'rotation'> & {
  size?: number;
  intensity?: number;
  /** rotation in the screen plane (radians) */
  rotation?: number;
  color?: string;
  time?: number;
  twinkle?: number;
  speed?: number;
  depthTest?: boolean;
};

/** One 4-point star glint billboard. */
export const Sparkle: React.FC<SparkleProps> = ({size = 0.3, intensity = 2.5, rotation = 0, color = '#ffffff', time, twinkle, speed = 0.8, depthTest = true, ...group}) => {
  const geo = useMemo(() => buildGeo([{pos: [0, 0, 0], size, rot: rotation, phase: 0.25, speed, color}]), [size, rotation, speed, color]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useSparkleMat({intensity, twinkle: time === undefined ? 0 : twinkle ?? 1, time: time ?? 0, spin: 0, depthTest});
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={10} />
    </group>
  );
};

export type SparkleFieldProps = GroupProps & {
  count?: number;
  seed?: number | string;
  time?: number;
  area?: [number, number, number];
  positions?: [number, number, number][];
  size?: number;
  sizeVar?: number;
  colors?: readonly string[];
  intensity?: number;
  twinkle?: number;
  speed?: number;
  spin?: number;
  depthTest?: boolean;
};

/** Many twinkling glints (one draw call). */
export const SparkleField: React.FC<SparkleFieldProps> = ({
  count = 40, seed = 1, time = 0, area = [6, 3, 2], positions, size = 0.22, sizeVar = 0.6, colors = DEFAULT_COLORS,
  intensity = 2.5, twinkle = 1, speed = 0.7, spin = 0.6, depthTest = true, ...group
}) => {
  const n = positions ? positions.length : count;
  const posKey = positions ? positions.map((p) => p.map((v) => v.toFixed(3)).join(',')).join(';') : '';
  const geo = useMemo(() => {
    const list: Inst[] = [];
    for (let i = 0; i < n; i++) {
      const r = (k: string) => rand(`spk|${seed}|${i}|${k}`);
      const pos = positions ? positions[i] : [(r('x') - 0.5) * area[0], (r('y') - 0.5) * area[1], (r('z') - 0.5) * area[2]];
      // skewed size distribution: mostly small, a few big hero glints
      const sz = size * (1 - sizeVar + sizeVar * 2 * Math.pow(r('s'), 2.2));
      list.push({pos, size: sz, rot: (r('r') - 0.5) * 0.5, phase: r('p'), speed: speed * (0.6 + 0.8 * r('v')), color: colors[Math.floor(r('c') * colors.length)]});
    }
    return buildGeo(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, seed, area[0], area[1], area[2], posKey, size, sizeVar, colors.join(), speed]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useSparkleMat({intensity, twinkle, time, spin, depthTest});
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={10} />
    </group>
  );
};
