/**
 * <LensFlare> — the early-2000s anamorphic lens flare: hot core, 4-point star, long blue horizontal streak, faint
 * rainbow halo and a chain of coloured hexagon ghosts mirrored through the screen centre. The flare SOURCE is a 3D
 * point (the group origin); everything else is laid out in screen space in the vertex shader, so it follows any
 * camera move with no JS per frame. Draws on top of everything (no depth test), additive + HDR (blooms).
 * Fades out when the source leaves the screen or goes behind the camera.
 *
 * Props (+ group props: position is the light source)
 *   intensity?: number = 1      overall brightness (animate for flashes; 0 hides)
 *   scale?: number = 1          overall size (fraction of screen height for the core ~0.25)
 *   color?: css = '#fff4e0'     core tint
 *   streakColor?: css = '#6fb6ff'
 *   rotation?: number = 0       star spin (rad) — e.g. time * 0.3
 *   ghosts?: boolean = true     streak?: number = 1 (streak length multiplier, 0 = none)
 *
 * Usage
 *   <LensFlare position={[2.5, 2, -3]} intensity={0.6 + 0.4 * beat.pulse} rotation={t * 0.2} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {fxAtlas, quadInstances, GLSL_ATLAS, GroupProps, ATLAS} from './shared';

type El = {t: number; w: number; h: number; color: string; a: number; cell: number; rot?: number; rainbow?: number; ghost?: number; streak?: number};

const ELEMENTS: El[] = [
  {t: 0, w: 0.75, h: 0.75, color: '#7fb6ff', a: 0.28, cell: ATLAS.dot},
  {t: 0, w: 0.26, h: 0.26, color: '#fff6e8', a: 1.3, cell: ATLAS.dot},
  {t: 0, w: 0.5, h: 0.5, color: '#ffffff', a: 1.1, cell: ATLAS.star, rot: 1},
  {t: 0, w: 0.3, h: 0.3, color: '#ffffff', a: 0.5, cell: ATLAS.star, rot: -0.6},
  {t: 0, w: 1.7, h: 0.03, color: '#6fb6ff', a: 0.9, cell: ATLAS.dot, streak: 1},
  {t: 0, w: 2.6, h: 0.009, color: '#cfeeff', a: 0.8, cell: ATLAS.dot, streak: 1},
  {t: 0, w: 0.62, h: 0.62, color: '#ffffff', a: 0.16, cell: ATLAS.ring, rainbow: 1},
  {t: 0.22, w: 0.05, h: 0.05, color: '#19C6FF', a: 0.4, cell: ATLAS.hex, ghost: 1},
  {t: 0.38, w: 0.1, h: 0.1, color: '#9BFF3A', a: 0.2, cell: ATLAS.hex, ghost: 1},
  {t: 0.5, w: 0.035, h: 0.035, color: '#FF4FB8', a: 0.55, cell: ATLAS.dot, ghost: 1},
  {t: 0.66, w: 0.14, h: 0.14, color: '#8A4DFF', a: 0.17, cell: ATLAS.hex, ghost: 1},
  {t: 0.82, w: 0.06, h: 0.06, color: '#FF8A1E', a: 0.32, cell: ATLAS.hex, ghost: 1},
  {t: 1.0, w: 0.21, h: 0.21, color: '#19C6FF', a: 0.12, cell: ATLAS.hex, ghost: 1},
  {t: 1.18, w: 0.08, h: 0.08, color: '#FF4FB8', a: 0.26, cell: ATLAS.hex, ghost: 1},
  {t: 1.42, w: 0.34, h: 0.34, color: '#BFF3FF', a: 0.14, cell: ATLAS.ring, rainbow: 1, ghost: 1},
];

const VERT = /* glsl */ `
uniform float uAspect;
uniform float uScale;
uniform float uRot;
uniform float uStreak;
uniform float uGhosts;
uniform float uIntensity;
attribute float iT;
attribute vec2 iSize;
attribute vec3 iColor;
attribute float iA;
attribute float iCell;
attribute float iRot;
attribute float iRainbow;
attribute float iGhost;
attribute float iStreakEl;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vCell;
varying float vRainbow;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float front = step(0.0001, clip.w);
  vec2 src = clip.xy / max(clip.w, 0.0001);
  float edge = max(abs(src.x), abs(src.y));
  float vis = front * (1.0 - smoothstep(1.0, 1.3, edge));
  vec2 p = mix(src, -src, iT);
  float a = uRot * iRot;
  vec2 sz = iSize * uScale;
  sz.x *= mix(1.0, uStreak, iStreakEl);
  vec2 c = position.xy * sz;
  c = mat2(cos(a), sin(a), -sin(a), cos(a)) * c;
  c.x /= uAspect;
  float ghostK = mix(1.0, uGhosts * (0.35 + 0.65 * smoothstep(0.0, 0.9, length(src))), iGhost);
  gl_Position = vec4(p + c, 0.0, 1.0);
  vUv = uv;
  vCol = iColor;
  vA = iA * vis * uIntensity * ghostK * (iStreakEl > 0.5 ? step(0.001, uStreak) : 1.0);
  vCell = iCell;
  vRainbow = iRainbow;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vCell;
varying float vRainbow;
${GLSL_ATLAS}
vec3 hue3(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  float m = texture2D(uTex, atlasUv(vUv, vCell)).r;
  vec3 col = vCol;
  if (vRainbow > 0.5) {
    vec2 q = vUv * 2.0 - 1.0;
    col = mix(hue3(length(q) * 1.2 + atan(q.y, q.x) * 0.08), vec3(1.0), 0.25);
  }
  gl_FragColor = vec4(col * m * vA, 1.0);
}`;

export type LensFlareProps = Omit<GroupProps, 'rotation' | 'scale'> & {
  intensity?: number;
  scale?: number;
  color?: string;
  streakColor?: string;
  rotation?: number;
  ghosts?: boolean;
  streak?: number;
};

export const LensFlare: React.FC<LensFlareProps> = ({
  intensity = 1, scale = 1, color = '#fff4e0', streakColor = '#6fb6ff', rotation = 0, ghosts = true, streak = 1, ...group
}) => {
  const {size} = useThree();
  const geo = useMemo(() => {
    const n = ELEMENTS.length;
    const T = new Float32Array(n), S = new Float32Array(n * 2), Co = new Float32Array(n * 3), A = new Float32Array(n);
    const Ce = new Float32Array(n), R = new Float32Array(n), Rb = new Float32Array(n), G = new Float32Array(n), St = new Float32Array(n);
    const c = new THREE.Color();
    ELEMENTS.forEach((e, i) => {
      T[i] = e.t;
      S.set([e.w, e.h], i * 2);
      c.set(i === 1 ? color : i === 4 ? streakColor : e.color);
      Co.set([c.r, c.g, c.b], i * 3);
      A[i] = e.a;
      Ce[i] = e.cell;
      R[i] = e.rot ?? 0;
      Rb[i] = e.rainbow ?? 0;
      G[i] = e.ghost ?? 0;
      St[i] = e.streak ?? 0;
    });
    return quadInstances(n, {iT: [1, T], iSize: [2, S], iColor: [3, Co], iA: [1, A], iCell: [1, Ce], iRot: [1, R], iRainbow: [1, Rb], iGhost: [1, G], iStreakEl: [1, St]});
  }, [streakColor, color]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTex: {value: fxAtlas()},
          uAspect: {value: 16 / 9},
          uScale: {value: 1},
          uRot: {value: 0},
          uStreak: {value: 1},
          uGhosts: {value: 1},
          uIntensity: {value: 1},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uScale.value = scale;
    u.uRot.value = rotation;
    u.uStreak.value = streak;
    u.uGhosts.value = ghosts ? 1 : 0;
    u.uIntensity.value = intensity;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={1000} visible={intensity > 0} />
    </group>
  );
};
