/**
 * <SpeedLines> — anime/manga radial speed lines around the camera (screen-space overlay drawn over the 3D scene, under
 * the post FX). Lines radiate from `center`, leave a clear hole of radius `inner` (fraction of screen height), taper
 * toward the middle, pulse outward and re-roll `flicker` times per second. Deterministic from `time`.
 * Place it anywhere inside <Stage> (position is ignored — it is a full-screen pass).
 *
 * Props
 *   intensity?: 0..1 = 1 (line density/opacity; animate to build up)   time?: 0 (s)   count?: 110 (angular slots)
 *   inner?: 0.45 (clear radius, screen-height units)   center?: [x, y] in NDC (-1..1) = [0, 0]
 *   color?: '#ffffff'   opacity?: 0.85   blend?: 'add' | 'normal' (normal + dark colour = ink manga lines)
 *   speed?: 1 (outward pulse speed)   flicker?: 12 (re-rolls per second)   seed?: 1   width?: 1 (line width multiplier)
 *
 * Usage
 *   <SpeedLines intensity={ramp(f, 0, 30)} time={t} />
 *   <SpeedLines blend="normal" color="#0a0820" inner={0.55} time={t} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {GLSL_HASH} from './shared';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uAspect;
uniform float uCount;
uniform float uInner;
uniform float uSeed;
uniform float uSpeed;
uniform float uFlicker;
uniform float uOpacity;
uniform float uRes;
uniform float uWidth;
uniform vec2 uCenter;
uniform vec3 uColor;
varying vec2 vUv;
${GLSL_HASH}
void main() {
  vec2 p = (vUv * 2.0 - 1.0 - uCenter) * vec2(uAspect, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x) / 6.2831853 + 0.5;
  float x = a * uCount;
  float cell = floor(x);
  float f = fract(x);
  float tq = floor(uTime * uFlicker);
  float h1 = hash12(vec2(cell, uSeed));
  float h2 = hash12(vec2(cell + 0.5, tq + uSeed * 3.1));
  float h3 = hash12(vec2(cell * 1.37, tq * 0.71 + 9.0 + uSeed));
  float on = step(h2, uIntensity * 0.85);
  float cx = 0.25 + 0.5 * h1;
  float wd = mix(0.06, 0.42, h3 * h3) * uWidth;
  float rs = uInner + h3 * 0.45 * (1.15 - uIntensity);
  float taper = smoothstep(rs, rs + 0.7, r);
  float hw = 0.5 * wd * taper;
  // analytic derivative of x per pixel (no atan seam)
  float fw = uCount / (3.14159265 * uRes * max(r, 1e-3)) * 1.2;
  float d = abs(f - cx);
  float line = 1.0 - smoothstep(hw - fw, hw + fw, d);
  line *= clamp(hw / fw, 0.0, 1.0) * 0.5 + 0.5;
  line *= smoothstep(rs, rs + 0.06, r);
  float pulse = 0.55 + 0.45 * smoothstep(0.0, 1.0, fract(r * 0.9 - uTime * uSpeed * 1.6 + h1 * 3.0));
  float alpha = line * on * pulse * uOpacity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}`;

export type SpeedLinesProps = {
  intensity?: number;
  time?: number;
  count?: number;
  inner?: number;
  center?: [number, number];
  color?: string;
  opacity?: number;
  blend?: 'add' | 'normal';
  speed?: number;
  flicker?: number;
  seed?: number;
  width?: number;
};

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  intensity = 1, time = 0, count = 110, inner = 0.45, center = [0, 0], color = '#ffffff', opacity = 0.85, blend = 'add', speed = 1,
  flicker = 12, seed = 1, width = 1,
}) => {
  const {size} = useThree();
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: {value: 0}, uIntensity: {value: 1}, uAspect: {value: 16 / 9}, uCount: {value: 110}, uInner: {value: 0.45}, uSeed: {value: 1},
          uSpeed: {value: 1}, uFlicker: {value: 12}, uOpacity: {value: 0.85}, uRes: {value: 1080}, uWidth: {value: 1},
          uCenter: {value: new THREE.Vector2()}, uColor: {value: new THREE.Color()},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        premultipliedAlpha: true,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uTime.value = time;
    u.uIntensity.value = intensity;
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uCount.value = Math.round(count);
    u.uInner.value = inner;
    u.uSeed.value = seed;
    u.uSpeed.value = speed;
    u.uFlicker.value = flicker;
    u.uOpacity.value = opacity;
    u.uRes.value = size.height;
    u.uWidth.value = width;
    u.uCenter.value.set(center[0], center[1]);
    u.uColor.value.set(color);
    // premultiplied output: additive = (One, One); normal = (One, OneMinusSrcAlpha)
    mat.blending = THREE.CustomBlending;
    mat.blendSrc = THREE.OneFactor;
    mat.blendDst = blend === 'add' ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={2000} visible={intensity > 0 && opacity > 0} />;
};
