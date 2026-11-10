/**
 * <Iris> — the TENURE mark: a circular red iris that reads as a logo, a camera lens and an eye at once
 * (DESIGN-silhouette §3). It appears on every device, door, screen and sky. Procedural shader on a flat disc
 * facing +Z, radius `radius` metres, origin at its centre.
 *
 *   <Iris open?={1} pupil?={0.32} radius?={0.5} intensity?={1.5} color?={S.authRed} time?={t}
 *         housing?={true} flicker?={0} glint?={true} opacity?={1} {...group}/>
 *
 *   open       0 = closed (a faint red pinpoint), 1 = fully open. Animate it to "open the eye".
 *   pupil      0..0.8 pupil (aperture) radius as a fraction of the iris radius. Dilate on bass hits for life.
 *   intensity  HDR multiplier of the red (default 1.5; > ~1.2 blooms). Pulse it with bassAt(). Above ~2 ACES tone mapping
 *              pushes red toward ORANGE, which starts to read as dawnGold — keep TENURE red at ≤ 2.
 *   color      the iris colour. authRed for TENURE; never anything else except a dying iris fading to S.ash.
 *   time       seconds; drives the slow aperture-blade rotation and the scan sweep (pass song time).
 *   housing    draw the black lens housing disc behind the rings (needed on bright backgrounds).
 *   flicker    0..1 failure flicker (Final scene: the red screens fail). Deterministic from `time`.
 *   glint      small bone-white specular dot in the pupil (makes it read as an eye/lens). It fades out with `intensity`
 *              below 1 (full at >= 1, gone at 0), so an iris dimmed to intensity 0 is a plain black housing disc
 *              without passing glint={false}. It also needs `open` > ~0.3.
 *   glow       0..1 pure-red additive halo around the disc (default 0.45). The red rings are soft-capped inside
 *              irisLayers so they never tone-map orange; brightness/presence comes from this halo + haze, not HDR.
 *
 * Also exported: IRIS_GLSL (the `irisColor(vec2 p, float open, float pupil, float time)` function) so instanced
 * walls of irises can reuse the exact same drawing, and makeIrisMaterial(opts) for custom geometry.
 * Deterministic. Ignores fog by default (screens glow through haze); pass fog to the material if needed.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from './palette';

/**
 * GLSL: returns vec4(rgb premultiplied by nothing, alpha) for a point p in [-1,1]² (|p| = 1 is the outer edge).
 * rgb is in "units of the iris colour" for the rings (r channel = ring intensity) — see usage in the fragment shader:
 *   vec4 k = irisLayers(p, open, pupil, time); // x = red ring intensity, y = housing alpha, z = glint, w = total alpha
 */
export const IRIS_GLSL = /* glsl */ `
float irisHash(float n) { return fract(sin(n) * 43758.5453123); }
vec4 irisLayers(vec2 p, float open, float pupil, float time) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float aa = fwidth(r) * 1.2 + 1e-4;
  float o = clamp(open, 0.0, 1.0);
  // everything scales out from the centre as the iris opens
  float scale = mix(0.06, 1.0, smoothstep(0.0, 1.0, o));
  float rr = r / scale;
  // outer thin ring
  float outer = smoothstep(0.90 - aa, 0.90 + aa, rr) * (1.0 - smoothstep(0.955 - aa, 0.955 + aa, rr));
  // iris body: 12 aperture blades (slow rotation) with radial striations, hotter toward the pupil edge
  float pr = mix(0.08, clamp(pupil, 0.02, 0.85), smoothstep(0.0, 0.6, o));
  float body = smoothstep(pr - aa, pr + aa, rr) * (1.0 - smoothstep(0.78 - aa, 0.78 + aa, rr));
  float blades = 12.0;
  float ba = a + time * 0.05 + rr * 0.9;
  float saw = fract(ba / 6.2831853 * blades);
  float bladeEdge = smoothstep(0.0, 0.06, saw) * (1.0 - smoothstep(0.9, 1.0, saw));
  float stri = 0.75 + 0.25 * sin(a * 96.0 + irisHash(floor(a * 15.0)) * 6.0);
  float heat = mix(1.6, 0.55, smoothstep(pr, 0.78, rr));
  float irisI = body * (0.35 + 0.65 * bladeEdge) * stri * heat;
  // hot ring at the pupil edge
  float pring = smoothstep(pr - aa * 2.0, pr, rr) * (1.0 - smoothstep(pr + 0.012, pr + 0.035 + aa, rr));
  // slow scan sweep (a brighter wedge rotating once every ~8 s)
  float sweep = pow(max(0.0, cos(a - time * 0.78)), 24.0) * body * 0.6;
  float ringI = outer * 0.9 + irisI + pring * 1.8 + sweep;
  // soft knee: the hot rings saturate at ~1.2 so (x intensity <= 1.5) the red never tone-maps toward orange/salmon
  ringI = ringI > 0.9 ? 0.9 + (1.0 - exp(-(ringI - 0.9) * 2.2)) * 0.3 : ringI;
  // housing disc (black lens body) out to the outer ring
  float housing = 1.0 - smoothstep(0.985 - aa, 0.985 + aa, rr);
  // pupil glint
  vec2 gp = p / scale - vec2(-0.32, 0.30) * pr;
  float glint = 1.0 - smoothstep(0.0, 0.07 * pr + aa, length(gp));
  glint *= step(rr, pr);
  // closed iris: a faint pinpoint stays visible
  float pin = (1.0 - smoothstep(0.0, 0.05, r)) * (1.0 - o) * 0.8;
  ringI = ringI * smoothstep(0.0, 0.08, o) + pin;
  float alpha = max(housing, clamp(ringI, 0.0, 1.0));
  return vec4(ringI, housing, glint * smoothstep(0.3, 0.8, o), alpha);
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  #include <begin_vertex>
  #include <project_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHousing;
uniform vec3 uGlint;
uniform float uOpen, uPupil, uTime, uFlicker, uHousingOn, uOpacity;
varying vec2 vUv;
${IRIS_GLSL}
float fh(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  if (length(p) > 1.0) discard;
  vec4 k = irisLayers(p, uOpen, uPupil, uTime);
  // failure flicker: stepped on/off pattern at ~24 Hz plus slow dropouts
  float fl = 1.0;
  if (uFlicker > 0.0) {
    float s = floor(uTime * 24.0);
    float on = step(uFlicker * 0.85, fh(s)) * (0.6 + 0.4 * fh(s + 7.0));
    fl = mix(1.0, on, clamp(uFlicker, 0.0, 1.0));
  }
  vec3 col = uHousing * k.y * uHousingOn;
  col += uColor * k.x * fl;
  col += uGlint * k.z * fl;
  float a = max(k.y * uHousingOn, clamp(k.x * fl, 0.0, 1.0)) * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type IrisOpts = {
  open?: number;
  pupil?: number;
  intensity?: number;
  color?: string;
  time?: number;
  housing?: boolean;
  flicker?: number;
  glint?: boolean;
  opacity?: number;
};

export const makeIrisMaterial = (o: IrisOpts = {}) => {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: {value: new THREE.Color()},
      uHousing: {value: new THREE.Color(S.void)},
      uGlint: {value: new THREE.Color()},
      uOpen: {value: 1},
      uPupil: {value: 0.32},
      uTime: {value: 0},
      uFlicker: {value: 0},
      uHousingOn: {value: 1},
      uOpacity: {value: 1},
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: true,
  });
  setIrisUniforms(m, o);
  return m;
};

export const setIrisUniforms = (m: THREE.ShaderMaterial, o: IrisOpts) => {
  const u = m.uniforms;
  const intensity = o.intensity ?? 1.5;
  u.uColor.value.set(o.color ?? S.authRed).multiplyScalar(intensity);
  // the glint dies with the iris: full at intensity >= 1, fading to nothing at 0 (a dead iris is a plain black disc)
  u.uGlint.value.set(S.bone).multiplyScalar(o.glint === false ? 0 : 1.4 * Math.min(1, Math.max(0, intensity)));
  u.uOpen.value = o.open ?? 1;
  u.uPupil.value = o.pupil ?? 0.32;
  u.uTime.value = o.time ?? 0;
  u.uFlicker.value = o.flicker ?? 0;
  u.uHousingOn.value = o.housing === false ? 0 : 1;
  u.uOpacity.value = o.opacity ?? 1;
};

const DISC = new THREE.PlaneGeometry(2, 2);

// Pure-red halo around the iris: the glow comes from spread, not from over-driving red (which turns orange).
const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uK;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float a = exp(-pow(max(r - 0.3, 0.0) * 3.4, 1.5)) * (1.0 - smoothstep(0.8, 1.0, r));
  gl_FragColor = vec4(uColor * a * uK, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const makeHaloMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {uColor: {value: new THREE.Color(S.authRed)}, uK: {value: 0.5}},
    vertexShader: VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

export type IrisProps = IrisOpts & {radius?: number; renderOrder?: number; glow?: number} & Omit<React.ComponentProps<'group'>, 'children'>;

export const Iris: React.FC<IrisProps> = ({open, pupil, intensity, color, time, housing, flicker, glint, opacity, radius = 0.5, renderOrder, glow = 0.45, ...group}) => {
  const mat = useMemo(() => makeIrisMaterial(), []);
  const halo = useMemo(() => makeHaloMat(), []);
  useLayoutEffect(() => () => {
    mat.dispose();
    halo.dispose();
  }, [mat, halo]);
  const o = Math.max(0, Math.min(1, open ?? 1));
  const fl = flicker ? 1 - Math.min(1, flicker) * 0.85 : 1;
  useLayoutEffect(() => {
    setIrisUniforms(mat, {open, pupil, intensity, color, time, housing, flicker, glint, opacity});
    halo.uniforms.uColor.value.set(color ?? S.authRed);
    halo.uniforms.uK.value = glow * o * fl * (opacity ?? 1) * Math.min(1.2, (intensity ?? 1.5) / 1.5);
  });
  return (
    <group {...group}>
      {glow > 0 ? (
        <mesh geometry={DISC} material={halo} scale={radius * 2.1} position={[0, 0, -0.002 * radius]} renderOrder={renderOrder} userData={{silKeep: true}} />
      ) : null}
      <mesh geometry={DISC} material={mat} scale={radius} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};
