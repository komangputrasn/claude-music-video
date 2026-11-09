/**
 * <FogLayers> — stacked, soft, noise-textured haze planes receding in depth (DESIGN-silhouette §2.3 "volumetric fog
 * everywhere"). Each layer is a vertical card facing +Z with a ragged soft top, soft sides and a soft ground contact
 * (no hard line where it meets the floor), textured by two octaves of domain-warped noise that drift deterministically
 * with `time`. Layers fade out as the camera approaches them (no flat card filling the screen), farther layers are
 * denser, and the scene fog tints the far ones. One shared material; one tiny geometry per layer so three.js depth-sorts
 * them correctly against your other transparent things.
 *
 *   <FogLayers count?={8} near?={4} far?={40} width?={80} height?={14} color?={S.fog} density?={0.16}
 *              time?={0} drift?={[0.25, 0.03]} pulse?={0} blending?={'normal'} scale?={9} ground?={0.8}
 *              fadeNear?={2} seed?={1} {...group}/>
 *
 *   Origin / layout: layer i sits at local z = −(near … far) (spaced slightly denser near the front), base at y = 0,
 *   centred on x = 0. Rotate the group with the camera for side views.
 *   HEROES STAY BLACK ONLY IN FRONT OF THE HAZE: every card between the camera and a silhouette veils it grey (with
 *   'normal' blending as much as 'additive'). Start the first card just BEHIND the hero (group at the camera's z and
 *   near ≈ camera-to-hero distance + 0.5–1 m, or the group just behind the hero and near ≈ 0.5); only far / crowd
 *   figures should stand inside the haze.
 *   count      number of cards (6–12 is plenty)          near/far   distances (m) along −Z of the first/last card
 *   width/height  card size (m). Make width cover the frustum at `far` (long lenses: far × 2·tan(fov/2) × 2.39).
 *   color      haze colour (S.fog lit haze; S.ash / GREYS.g5 for dark haze; never a hue except Final dawnGold haze)
 *   density    per-card opacity at full noise (0.1–0.3). The total haze is roughly 1 − (1 − d)^count.
 *   time       seconds (song time); drift  [x, y] m/s the noise slides at (each card at a slightly different speed)
 *   pulse      0..1 beat breathing (e.g. beatAt(t).pulse * 0.6 or bassAt(f)): thickens and brightens the haze
 *   blending   'normal' = veils what is behind with `color` (real haze; distant silhouettes go grey → depth)
 *              'additive' = glows (lit haze in front of a backlight / beam). Additive in front of a hero WASHES it grey.
 *   scale      noise feature size in metres (bigger = larger billows)
 *   ground     metres over which a card fades in from y = 0 (hides the card/floor intersection)
 *   fadeNear   cards closer to the camera than ~fadeNear (m) fade out (they'd read as flat sheets)
 *
 * Usage
 *   <FogLayers position={[0, 0, heroZ - 0.5]} near={0.5} far={45} time={t} pulse={beatAt(t).pulse * 0.5} />
 *   <FogLayers color={S.bone} blending="additive" density={0.07} near={10} far={30} time={t} />   // glow around a light
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {rand} from '../../../lib/time';
import {atmosNoise, blendOf, AtmosBlend, GroupProps, withFog} from './shared';

export type FogLayersProps = GroupProps & {
  count?: number;
  near?: number;
  far?: number;
  width?: number;
  height?: number;
  color?: string;
  density?: number;
  time?: number;
  drift?: [number, number];
  pulse?: number;
  blending?: AtmosBlend;
  scale?: number;
  ground?: number;
  fadeNear?: number;
  seed?: number;
  renderOrder?: number;
};

const VERT = /* glsl */ `
attribute vec4 aLayer;
varying vec2 vUv;
varying vec4 vL;
varying float vDist;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vL = aLayer;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uColor;
uniform vec2 uSize;
uniform vec2 uDrift;
uniform float uDensity, uTime, uPulse, uScale, uGround, uFadeNear;
varying vec2 vUv;
varying vec4 vL;
varying float vDist;
#include <fog_pars_fragment>
void main() {
  vec2 w = vUv * uSize;
  vec2 off = vL.yz * 13.7;
  vec2 d = uDrift * uTime * (0.55 + 0.9 * vL.y);
  float n1 = texture2D(uNoise, (w - d) / uScale + off).r;
  float n2 = texture2D(uNoise, (w * 2.1 - d * 1.9) / uScale + off.yx * 1.3).g;
  float n3 = texture2D(uNoise, (w - d * 0.4) / (uScale * 3.5) + off * 0.5).b;
  float n = n1 * 0.55 + n2 * 0.2 + n3 * 0.25;
  float wisps = smoothstep(0.18, 0.82, n);
  // card shape: soft sides, ragged soft top, soft ground contact
  float sx = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  float top = 0.42 + 0.3 * (n3 - 0.5) + 0.2 * (n1 - 0.5);
  float sy = smoothstep(0.0, uGround / uSize.y, vUv.y) * (1.0 - smoothstep(top, 1.0, vUv.y)) * mix(1.15, 0.75, vUv.y);
  float a = uDensity * vL.w * sx * sy * mix(0.25, 1.0, wisps) * (1.0 + uPulse * 0.6);
  a *= smoothstep(uFadeNear, uFadeNear * 2.5 + 0.5, vDist);
  vec3 col = uColor * (1.0 + uPulse * 0.22) * mix(0.82, 1.12, n);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <fog_fragment>
}`;

export const FogLayers: React.FC<FogLayersProps> = ({
  count = 8, near = 4, far = 40, width = 80, height = 14, color = S.fog, density = 0.16, time = 0, drift = [0.25, 0.03],
  pulse = 0, blending = 'normal', scale = 9, ground = 0.8, fadeNear = 2, seed = 1, renderOrder, ...group
}) => {
  const n = Math.max(1, Math.round(count));
  const geos = useMemo(() => {
    const out: {g: THREE.BufferGeometry; z: number}[] = [];
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : i / (n - 1);
      const z = -(near + (far - near) * Math.pow(k, 1.15));
      const g = new THREE.PlaneGeometry(width, height);
      g.translate(0, height / 2, 0);
      const L = new Float32Array(4 * 4);
      const r1 = rand(`fogL|${seed}|${i}|a`), r2 = rand(`fogL|${seed}|${i}|b`);
      const weight = 0.55 + 0.45 * k;
      for (let v = 0; v < 4; v++) L.set([k, r1, r2, weight], v * 4);
      g.setAttribute('aLayer', new THREE.Float32BufferAttribute(L, 4));
      out.push({g, z});
    }
    return out;
  }, [n, near, far, width, height, seed]);
  useLayoutEffect(() => () => geos.forEach((l) => l.g.dispose()), [geos]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: withFog({
          uNoise: {value: null}, uColor: {value: new THREE.Color()}, uSize: {value: new THREE.Vector2()}, uDrift: {value: new THREE.Vector2()},
          uDensity: {value: 0.16}, uTime: {value: 0}, uPulse: {value: 0}, uScale: {value: 9}, uGround: {value: 0.8}, uFadeNear: {value: 2},
        }),
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uNoise.value = atmosNoise(1);
    u.uColor.value.set(color);
    u.uSize.value.set(width, height);
    u.uDrift.value.set(drift[0], drift[1]);
    u.uDensity.value = density;
    u.uTime.value = time;
    u.uPulse.value = pulse;
    u.uScale.value = scale;
    u.uGround.value = ground;
    u.uFadeNear.value = fadeNear;
    mat.blending = blendOf(blending);
  });
  return (
    <group {...group}>
      {geos.map((l, i) => (
        // mesh origin at the card's depth so three.js sorts the cards back-to-front with other transparents
        <mesh key={i} geometry={l.g} material={mat} position-z={l.z} renderOrder={renderOrder} frustumCulled={false} visible={density > 0} />
      ))}
    </group>
  );
};
