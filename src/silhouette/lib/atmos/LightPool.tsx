/**
 * <LightPool> — a soft pool of light on the ground plus a faint column of lit haze rising from it
 * (DESIGN-silhouette §3/§4: the red pool under the feeder monolith; the dawnGold pool around Pancake's bowl in Final —
 * gold ONLY from the Final chorus on). Origin = the pool's centre ON THE GROUND (y = 0); the disc floats 4 mm up.
 * Additive, depthWrite off, fog-free. Front-facing only (does not show up upside-down in <WetGround> reflections; the
 * haze column does reflect).
 *
 *   <LightPool position?={[0, 0, 0]} radius?={2} color?={S.bone} intensity?={1} haze?={0.35} hazeHeight?={radius * 1.4}
 *              softness?={0.7} breakup?={0.3} seed?={1} {...group}/>
 *
 *   radius      metres to where the light has fully died
 *   intensity   HDR multiplier of the pool centre. ~1 = bright but under bloom for bone; gold/red pools: 1–1.8
 *               (red ≤ 2). A pool is a big surface: let only its very centre bloom, if anything.
 *   haze        0..1 brightness of the soft lit-fog column above the pool (gives silhouettes standing in it a backlit
 *               halo when seen from a low camera). 0 = disc only.
 *   hazeHeight  height of that column (m)
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

export type LightPoolProps = GroupProps & {
  radius?: number;
  color?: string;
  intensity?: number;
  haze?: number;
  hazeHeight?: number;
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

const HAZE_VERT = /* glsl */ `
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  vH = position.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * vec3(position.x, 0.0, position.z));
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const HAZE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHeight;
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float h = clamp(vH / uHeight, 0.0, 1.0);
  float m = pow(facing, 2.2) * pow(1.0 - h, 2.2) * smoothstep(0.0, 0.04, h);
  gl_FragColor = vec4(uColor * m, 1.0);
}`;

const DISC = (() => {
  const g = new THREE.CircleGeometry(1, 72);
  return g;
})();
let hazeGeo: THREE.CylinderGeometry | null = null;
const getHaze = () => {
  if (!hazeGeo) {
    hazeGeo = new THREE.CylinderGeometry(0.62, 0.9, 1, 64, 1, true);
    hazeGeo.translate(0, 0.5, 0);
  }
  return hazeGeo;
};

export const LightPool: React.FC<LightPoolProps> = ({
  radius = 2, color = S.bone, intensity = 1, haze = 0.35, hazeHeight, softness = 0.7, breakup = 0.3, seed = 1, renderOrder = 1, ...group
}) => {
  const hh = hazeHeight ?? radius * 1.4;
  const mats = useMemo(() => {
    const disc = new THREE.ShaderMaterial({
      uniforms: {
        uColor: {value: new THREE.Color()}, uRadius: {value: 1}, uSoft: {value: 0.7}, uBreak: {value: 0.3}, uSeed: {value: 1},
        uNoise: {value: atmosNoise(1)},
      },
      vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const hz = new THREE.ShaderMaterial({
      uniforms: {uColor: {value: new THREE.Color()}, uHeight: {value: 1}},
      vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      side: THREE.DoubleSide,
    });
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
    const h = mats.haze.uniforms;
    h.uColor.value.set(color).multiplyScalar(intensity * haze * 0.35);
    h.uHeight.value = 1;
  });
  return (
    <group {...group}>
      <mesh geometry={DISC} material={mats.disc} rotation-x={-Math.PI / 2} position-y={0.004} scale={radius} renderOrder={renderOrder} visible={intensity > 0} />
      {haze > 0 ? (
        <mesh geometry={getHaze()} material={mats.haze} scale={[radius, hh, radius]} renderOrder={renderOrder + 3} visible={intensity > 0} />
      ) : null}
    </group>
  );
};
