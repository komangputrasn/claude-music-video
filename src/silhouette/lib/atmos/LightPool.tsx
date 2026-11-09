/**
 * <LightPool> — a soft pool of light on the ground plus a faint column of lit haze rising from it
 * (DESIGN-silhouette §3/§4: the red pool under the feeder monolith; the dawnGold pool around Pancake's bowl in Final —
 * gold ONLY from the Final chorus on). Origin = the pool's centre ON THE GROUND (y = 0); the disc floats 8 mm up.
 * Additive, depthWrite off, fog-free. The disc is front-facing only (it does not show up upside-down in <WetGround>
 * reflections; the haze column does reflect).
 *
 *   <LightPool position?={[0, 0, 0]} radius?={2} color?={S.bone} intensity?={1} haze?={0.35} hazeHeight?={radius * 1.4}
 *              hazeRadius?={radius * 0.6} softness?={0.7} breakup?={0.3} seed?={1} {...group}/>
 *
 *   radius      metres to where the light has fully died
 *   intensity   HDR multiplier of the pool centre. ~1 = bright but under bloom for bone; gold/red pools: 1–1.8
 *               (red ≤ 2). A pool is a big surface: let only its very centre bloom, if anything.
 *   haze        0..1 brightness of the soft lit-fog column above the pool (gives silhouettes standing in it a backlit
 *               halo when seen from a low camera). 0 = disc only.
 *   hazeHeight  height of that column (m)       hazeRadius  its radius at the floor (m; it narrows to 60 % at the top)
 *               The haze is a ray-marched volume (the <LightShaft> shader): silhouettes standing in it stay pure
 *               black, but a BIG opaque object (a monolith) that straddles the haze's back surface cuts it with a hard
 *               edge — keep hazeRadius small enough that the column stands clear of large architecture.
 *   softness    0..1 fraction of the radius that is falloff (1 = pure gradient, 0.3 = a hard-edged spotlight disc)
 *   breakup     0..1 concrete/noise variation inside the pool (no CG-perfect gradient)
 *
 * Usage
 *   <LightPool position={[0, 0, 0.6]} radius={1.6} color={S.authRed} intensity={1.3} haze={0.25} />   // under the feeder
 *   <LightPool position={bowlPos} radius={1.3} color={S.dawnGold} intensity={1.6} haze={0.5} />      // FINAL ONLY
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {atmosNoise, GroupProps} from './shared';
import {getShaftHull, makeShaftVolumeMaterial} from './LightShaft';

export type LightPoolProps = GroupProps & {
  radius?: number;
  color?: string;
  intensity?: number;
  haze?: number;
  hazeHeight?: number;
  hazeRadius?: number;
  softness?: number;
  breakup?: number;
  seed?: number;
  renderOrder?: number;
};

const DISC_VERT = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const DISC_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uRadius, uSoft, uBreak, uSeed;
uniform sampler2D uNoise;
varying vec2 vP;
void main() {
  float d = length(vP);            // geometry is a unit disc scaled by the radius
  vec2 w = vP * uRadius;           // metres, for the noise
  float s = clamp(uSoft, 0.05, 1.0);
  float m = 1.0 - smoothstep(1.0 - s, 1.0, d);
  m = m * m * (0.65 + 0.35 * exp(-d * d * 6.0));
  float n = texture2D(uNoise, w / 1.7 + uSeed * 0.37).r * 0.6 + texture2D(uNoise, w / 0.35 + uSeed).a * 0.4;
  m *= 1.0 - uBreak * (1.0 - n) * 1.2;
  gl_FragColor = vec4(uColor * max(m, 0.0), 1.0);
}`;

const DISC = (() => {
  const g = new THREE.CircleGeometry(1, 72);
  return g;
})();
export const LightPool: React.FC<LightPoolProps> = ({
  radius = 2, color = S.bone, intensity = 1, haze = 0.35, hazeHeight, hazeRadius, softness = 0.7, breakup = 0.3, seed = 1, renderOrder = 1, ...group
}) => {
  const hh = hazeHeight ?? radius * 1.4;
  const hr = hazeRadius ?? radius * 0.6;
  const mats = useMemo(() => {
    const disc = new THREE.ShaderMaterial({
      uniforms: {
        uColor: {value: new THREE.Color()}, uRadius: {value: 1}, uSoft: {value: 0.7}, uBreak: {value: 0.3}, uSeed: {value: 1},
        uNoise: {value: atmosNoise(1)},
      },
      vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4,
    });
    const hz = makeShaftVolumeMaterial();
    return {disc, haze: hz};
  }, []);
  useLayoutEffect(() => () => {
    mats.disc.dispose();
    mats.haze.dispose();
  }, [mats]);
  useLayoutEffect(() => {
    const d = mats.disc.uniforms;
    d.uColor.value.set(color).multiplyScalar(intensity);
    d.uRadius.value = radius;
    d.uSoft.value = softness;
    d.uBreak.value = breakup;
    d.uSeed.value = seed;
    // the haze is a ray-marched frustum (same volume shader as <LightShaft>): wide at the floor, fading upward;
    // silhouettes standing in it stay pure black (drawn from back faces)
    const h = mats.haze.uniforms;
    h.uR0.value = hr;
    h.uR1.value = hr * 0.6;
    h.uLen.value = hh;
    h.uColor.value.set(color).multiplyScalar(intensity * haze * 0.9);
    h.uFalloff.value = 1.8;
    h.uSoft.value = 1.6;
    h.uStri.value = 0.25;
    h.uGround.value = -1e4; // world space: no floor cut (the column starts on the pool's floor, whatever its height)
    h.uGroundFade.value = 0;
    h.uSeed.value = seed;
  });
  return (
    <group {...group}>
      <mesh geometry={DISC} material={mats.disc} rotation-x={-Math.PI / 2} position-y={0.008} scale={radius} renderOrder={renderOrder} visible={intensity > 0} />
      {haze > 0 ? (
        <mesh geometry={getShaftHull()} material={mats.haze} position-y={0.002} renderOrder={renderOrder + 3} frustumCulled={false} visible={intensity > 0} />
      ) : null}
    </group>
  );
};
