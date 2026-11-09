/**
 * <WetGround> — wet, mirror-like concrete that reflects the screens, irises, backlights and silhouettes above it with
 * a streaky softness (DESIGN-silhouette §2.3 "rain and wet ground with mirror reflections").
 *
 * Built on three's Reflector (three/examples/jsm/objects/Reflector.js) with a custom shader. VERIFIED to render under
 * Remotion + the <SilStage> EffectComposer (preview .preview/out/silplay-Atmos/, WetGround shot): the Reflector renders
 * the scene from a mirrored camera into its own HalfFloat target in onBeforeRender (nested inside the composer's
 * RenderPass), so the reflection is linear HDR like the main buffer — reflected screens/irises still bloom.
 * The shader mixes that reflection with dark noisy concrete:
 *   - puddles (low-frequency noise, `puddles` = coverage) are near-perfect mirrors with a darker base;
 *   - the wet concrete between them reflects less and SMEARS the reflection vertically (streaks of light toward the
 *     camera, like wet asphalt at night); `streak` scales the smear;
 *   - Fresnel: reflections get stronger at grazing angles (long lens, low camera = most mirror-like);
 *   - optional animated ripples (`ripple` with `time`, e.g. under <SilRain>);
 *   - scene fog applies (the far ground melts into the haze).
 * Origin = centre of the ground, ON y = 0; it lies flat (XZ) facing +Y. Opaque (it IS the floor: don't add another).
 *
 *   <WetGround size?={[160, 160]} color?={GREYS.g2} reflectivity?={0.8} puddles?={0.45} streak?={1} ripple?={0}
 *              time?={0} seed?={1} resolution?={0.5} {...group}/>
 *
 *   size          [x, z] metres (or one number)
 *   color         base concrete colour (keep it near-black: GREYS.g1–g3; the reflections carry the light)
 *   reflectivity  0..1 master reflection strength (0 = dry dark concrete)
 *   puddles       0..1 puddle coverage (0 = uniformly wet concrete, 1 = one big mirror / flooded)
 *   streak        0..2 vertical smear length on the wet (non-puddle) concrete
 *   ripple        0..1 animated rain ripples (needs `time`)
 *   resolution    reflection render-target scale relative to the canvas (0.5 is plenty: it is blurred anyway)
 *
 * Caveats
 *   - Costs a second full scene render (the mirrored view) per frame. Use ONE WetGround per shot.
 *   - Only things ABOVE y = 0 reflect (oblique clip plane); objects must not be needed below the floor.
 *   - Ground decals (LightPool disc, BlindsLight on the floor, ScanLine on the floor) render on top of it normally.
 *   - The reflection is of the scene as the camera sees it — fog layers, beams and rain reflect too (that's the look).
 *
 * Usage
 *   <WetGround puddles={0.5} ripple={0.4} time={t} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {Reflector} from 'three/examples/jsm/objects/Reflector.js';
import {GREYS} from '../palette';
import {rand} from '../../../lib/time';
import {atmosNoise, GroupProps} from './shared';

export type WetGroundProps = GroupProps & {
  size?: number | [number, number];
  color?: string;
  reflectivity?: number;
  puddles?: number;
  streak?: number;
  ripple?: number;
  time?: number;
  seed?: number;
  resolution?: number;
};

const VERT = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec2 vLocal;
varying vec3 vWorld;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D uNoise;
uniform vec3 uBase;
uniform vec2 uSeed;
uniform float uReflect, uPuddles, uStreak, uRipple, uTime;
varying vec4 vUv;
varying vec2 vLocal;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 wp = vLocal + uSeed;
  float big = texture2D(uNoise, wp / 13.0).b;
  float mid = texture2D(uNoise, wp / 3.3).r;
  float fine = texture2D(uNoise, wp / 0.5).a;
  float grit = texture2D(uNoise, wp / 0.11).a;
  float pv = big * 0.72 + mid * 0.28;
  float thr = mix(1.05, -0.05, clamp(uPuddles, 0.0, 1.0));
  float puddle = smoothstep(thr - 0.03, thr + 0.03, pv);
  float rough = mix(1.0, 0.04, puddle);
  // micro-normal: grit perturbs the wet concrete, slow ripples perturb everything
  vec2 rip = vec2(texture2D(uNoise, wp / 0.7 + vec2(uTime * 0.21, uTime * 0.13)).g, texture2D(uNoise, wp / 0.7 - vec2(uTime * 0.17, -uTime * 0.19)).g) - 0.5;
  vec2 dist = rip * uRipple * 0.012 + (vec2(grit, fine) - 0.5) * 0.006 * rough;
  vec2 uv = vUv.xy / vUv.w + dist;
  // streaky blur along the reflection's vertical (toward the camera on screen)
  float L = uStreak * 0.07 * rough + 0.002;
  vec3 acc = vec3(0.0);
  float ws = 0.0;
  for (int i = 0; i < 11; i++) {
    float k = float(i) / 10.0 * 2.0 - 1.0;
    float w = exp(-k * k * 2.2);
    acc += texture2D(tDiffuse, uv + vec2(k * L * 0.08, k * L)).rgb * w;
    ws += w;
  }
  vec3 refl = acc / ws;
  vec3 V = normalize(cameraPosition - vWorld);
  float cosT = clamp(V.y, 0.0, 1.0);
  float fres = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);
  float rk = uReflect * mix(0.42 + 0.25 * fine, 1.0, puddle) * (0.3 + 0.7 * fres);
  vec3 base = uBase * (0.55 + 0.45 * mid) * (0.75 + 0.5 * fine) * mix(1.0, 0.4, puddle);
  gl_FragColor = vec4(base + refl * rk, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const WET_SHADER = {
  name: 'SilWetGround',
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      color: {value: null},
      tDiffuse: {value: null},
      textureMatrix: {value: null},
      uNoise: {value: null},
      uBase: {value: new THREE.Color()},
      uSeed: {value: new THREE.Vector2()},
      uReflect: {value: 0.8},
      uPuddles: {value: 0.45},
      uStreak: {value: 1},
      uRipple: {value: 0},
      uTime: {value: 0},
    },
  ]),
  vertexShader: VERT,
  fragmentShader: FRAG,
};

export const WetGround: React.FC<WetGroundProps> = ({
  size = [160, 160], color = GREYS.g2, reflectivity = 0.8, puddles = 0.45, streak = 1, ripple = 0, time = 0, seed = 1, resolution = 0.5,
  ...group
}) => {
  const [w, d] = typeof size === 'number' ? [size, size] : size;
  const {size: vp, gl} = useThree();
  const pr = gl.getPixelRatio();
  const tw = Math.max(64, Math.round(vp.width * pr * resolution));
  const th = Math.max(64, Math.round(vp.height * pr * resolution));
  const refl = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(w, d), {
      clipBias: 0.003, textureWidth: tw, textureHeight: th, shader: WET_SHADER, multisample: 0, color: 0x7f7f7f,
    });
    r.rotation.x = -Math.PI / 2;
    (r.material as THREE.ShaderMaterial).fog = true;
    r.renderOrder = -20;
    return r;
  }, [w, d, tw, th]);
  useLayoutEffect(() => () => {
    refl.geometry.dispose();
    refl.dispose();
  }, [refl]);
  useLayoutEffect(() => {
    const u = (refl.material as THREE.ShaderMaterial).uniforms;
    u.uNoise.value = atmosNoise(1);
    u.uBase.value.set(color);
    u.uSeed.value.set(rand(`wet|${seed}|x`) * 97, rand(`wet|${seed}|y`) * 97);
    u.uReflect.value = reflectivity;
    u.uPuddles.value = puddles;
    u.uStreak.value = streak;
    u.uRipple.value = ripple;
    u.uTime.value = time;
  });
  return (
    <group {...group}>
      <primitive object={refl} />
    </group>
  );
};
