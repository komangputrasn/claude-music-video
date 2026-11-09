/**
 * <LightShaft> — a volumetric cone/shaft of light in fog: searchlights, red drone cones, window shafts, the single
 * light in the Hold scene (DESIGN-silhouette §2.3).
 *
 * TRUE VOLUME, not a shell: the cone (apex `from`, radiusStart → `to`, radiusEnd) is ray-marched per pixel (analytic
 * ray/frustum intersection + 14 jittered samples): soft radial profile, length falloff, faint diverging striations
 * (dust "rays") drifting with `time`, optional dust motes. It reads correctly from ANY angle — from the side, from
 * below, looking straight down the beam, or with the camera inside it. Additive, depthWrite off, fog-free.
 * It is drawn from the hull's BACK faces, so a silhouette standing inside the beam cuts a clean pure-black shape
 * through it (no grey veil over heroes). Positions are in the parent's space (the group is NOT moved by from/to).
 *
 *   <LightShaft from={[0, 9, -2]} to={[0, 0, 0]} radiusStart?={0.15} radiusEnd?={1.6} color?={S.bone}
 *               intensity?={1} time?={0} dust?={0} falloff?={1.0} softness?={1.4} striation?={0.5}
 *               source?={0} ground?={0} groundFade?={0.35} dustSize?={0.018} dustSpeed?={0.05} seed?={1} {...group}/>
 *
 *   from / to        apex (the lamp) and the end of the beam, metres. Animate `to` to sweep a searchlight.
 *                    End a beam that hits the floor ON the floor (to.y = ground), not below it.
 *   radiusStart/End  beam radius at the lamp / at the end (m). radiusStart 0 = a point source.
 *   color            S.bone (window/searchlight), S.authRed (TENURE drones/scanners), dawnGold ONLY Final/Outro.
 *   intensity        HDR multiplier: on-axis brightness seen from the side ≈ color × intensity × ~0.8, saturating to
 *                    ≤ 1.3 × color × intensity when looking down the beam. Beams MAY bloom ("only screens, beams,
 *                    irises glow"). RED: the core is ~1.3 × intensity, so keep authRed beams at intensity ≤ ~1.1
 *                    (HDR ≤ ~1.5) and the haze BEHIND them dim (Backlight ≤ ~0.25): at 1.5 over grey haze the cones
 *                    read salmon/orange, not authRed (verified in the playground).
 *   falloff          exponent of the fade along the length (higher = dies sooner); the far end always reaches 0.
 *   softness         exponent of the radial profile (1 = flat-ish beam with soft edge, 2–3 = hot core, soft sides).
 *   striation        0..1 strength of the faint diverging streaks in the beam.
 *   ground/groundFade  world-space floor height and the fade (m) above it: the beam dissolves into the floor instead
 *                    of showing a hard intersection curve (groundFade 0 = full light down to the floor). The hull is
 *                    also flattened onto y = ground so nothing is cut where the cone dips under the floor. No floor at
 *                    0? pass the real floor height (or ground={-1e4} for a beam in open air).
 *   Occluders: the volume is drawn from its back faces, so START a beam in front of any wall it shines through
 *                    (e.g. `from` just inside a doorway, not behind the wall) — back faces hidden behind an opaque
 *                    surface drop the whole ray. Opaque things INSIDE the beam render as clean black cut-outs.
 *   dust             number of instanced motes inside the cone (0 = none; 150–600 good). One draw call, drifting
 *                    along the beam at `dustSpeed` m/s and lit by it (brighter near the lamp).
 *   source           0..~3 brightness of a camera-facing glow sprite at the lamp (blooms: reads as the light itself).
 *                    Red lamps: ≤ ~1.2 (the sprite centre is ~2 × source × intensity; hotter turns orange).
 *
 * Usage
 *   <LightShaft from={[0, 12, 0]} to={[0, 0, 0]} radiusStart={0.2} radiusEnd={1.4} dust={300} time={t} />   // Hold
 *   <LightShaft from={[-4, 8, -6]} to={[x, 0, 0]} radiusEnd={1.2} color={S.authRed} intensity={1.05} source={1.1} time={t} />
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {S} from '../palette';
import {rand} from '../../../lib/time';
import {quadInstances} from '../../../lib/three/fx/shared';
import {atmosNoise, GLSL_BILLBOARD, GroupProps, V3} from './shared';

export type LightShaftProps = GroupProps & {
  from: V3;
  to: V3;
  radiusStart?: number;
  radiusEnd?: number;
  color?: string;
  intensity?: number;
  time?: number;
  dust?: number;
  falloff?: number;
  softness?: number;
  striation?: number;
  source?: number;
  ground?: number;
  groundFade?: number;
  dustSize?: number;
  dustSpeed?: number;
  seed?: number;
  renderOrder?: number;
};

const VOL_VERT = /* glsl */ `
uniform float uR0, uR1, uLen, uGround;
varying vec3 vLocal;
varying vec3 vCam;
varying vec4 vRowY;
void main() {
  float y = position.y;
  vRowY = vec4(modelMatrix[0][1], modelMatrix[1][1], modelMatrix[2][1], modelMatrix[3][1]); // world y = dot(vRowY, vec4(p, 1))
  float r = mix(uR0, uR1, y) * 1.04 + 0.004;
  vec3 p = vec3(position.x * r, y * uLen, position.z * r);
  // flatten the hull onto the floor: back faces under the floor would be depth-rejected and cut the beam
  vec4 wp = modelMatrix * vec4(p, 1.0);
  wp.y = max(wp.y, uGround + 0.003);
  mat4 inv = inverse(modelMatrix);
  vLocal = (inv * wp).xyz;
  vCam = (inv * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/** shared ray-marched frustum body (also used by LightPool's haze) */
export const GLSL_SHAFT_VOLUME = /* glsl */ `
uniform vec3 uColor;
uniform float uR0, uR1, uLen, uTime, uFalloff, uSoft, uStri, uGround, uGroundFade, uSeed;
uniform sampler2D uNoise;
varying vec3 vLocal;
varying vec3 vCam;
varying vec4 vRowY;
float shHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 ro = vCam;
  vec3 rd = normalize(vLocal - ro);
  // slab 0 <= y <= L
  float tA = 0.0, tB = 1e6;
  if (abs(rd.y) < 1e-6) {
    if (ro.y < 0.0 || ro.y > uLen) discard;
  } else {
    float ty0 = (0.0 - ro.y) / rd.y, ty1 = (uLen - ro.y) / rd.y;
    tA = max(tA, min(ty0, ty1));
    tB = min(tB, max(ty0, ty1));
  }
  // frustum side: x^2 + z^2 <= (r0 + k y)^2  (a truncated cone is convex: one interval)
  float k = (uR1 - uR0) / uLen;
  float rb = uR0 + k * ro.y;
  float a = rd.x * rd.x + rd.z * rd.z - k * k * rd.y * rd.y;
  float b = ro.x * rd.x + ro.z * rd.z - k * rb * rd.y;
  float c = ro.x * ro.x + ro.z * ro.z - rb * rb;
  if (abs(a) < 1e-7) {
    if (abs(b) < 1e-7) { if (c > 0.0) discard; }
    else { float ts = -c / (2.0 * b); if (b > 0.0) tB = min(tB, ts); else tA = max(tA, ts); }
  } else {
    float disc = b * b - a * c;
    if (disc <= 0.0) { if (a > 0.0) discard; }
    else {
      float sq = sqrt(disc);
      float t0 = (-b - sq) / a, t1 = (-b + sq) / a;
      if (t0 > t1) { float tmp = t0; t0 = t1; t1 = tmp; }
      if (a > 0.0) { tA = max(tA, t0); tB = min(tB, t1); }
      else if (t0 > tA) { tB = min(tB, t0); }
      else { tA = max(tA, t1); }
    }
  }
  if (tB <= tA) discard;
  const int N = 14;
  float dt = (tB - tA) / float(N);
  float j = shHash(gl_FragCoord.xy + uSeed * 17.0);
  float acc = 0.0;
  for (int i = 0; i < N; i++) {
    float t = tA + (float(i) + j) * dt;
    vec3 p = ro + rd * t;
    float yn = clamp(p.y / uLen, 0.0, 1.0);
    float rr = max(uR0 + k * p.y, 1e-3);
    vec2 cs = p.xz / rr;
    float rho2 = dot(cs, cs);
    float prof = pow(clamp(1.0 - rho2, 0.0, 1.0), uSoft);
    float along = smoothstep(0.0, 0.03, yn) * pow(1.0 - yn, uFalloff);
    float n = textureLod(uNoise, vec2(cs.x * 0.23 + cs.y * 0.11 + 0.5 + uSeed * 0.13, cs.y * 0.19 - cs.x * 0.07 + yn * 0.08 - uTime * 0.01), 1.0).g;
    float stri = mix(1.0, 0.35 + 1.3 * n, uStri);
    float wy = dot(vRowY, vec4(p, 1.0));
    float gf = uGroundFade > 0.0 ? smoothstep(uGround, uGround + uGroundFade, wy) : step(uGround - 1e-3, wy);
    acc += prof * along * stri * gf / rr;
  }
  float I = acc * dt;
  gl_FragColor = vec4(uColor * (1.0 - exp(-I * 1.15)) * 1.3, 1.0);
}`;

const DUST_VERT = /* glsl */ `
uniform float uR0, uR1, uLen, uTime, uSize, uSpeed;
attribute vec4 iA; // t0, radial, angle, phase
varying vec2 vUv;
varying float vB;
${GLSL_BILLBOARD}
void main() {
  float t = fract(iA.x + uTime * uSpeed / max(uLen, 1e-3) * (0.5 + iA.w));
  float ang = iA.z * 6.2831853 + sin(uTime * 0.35 + iA.w * 17.0) * 0.25;
  float r = sqrt(iA.y) * mix(uR0, uR1, t) * 0.92;
  vec3 c = vec3(cos(ang) * r, t * uLen, sin(ang) * r);
  c.x += sin(uTime * 0.6 + iA.w * 31.0) * 0.03;
  c.z += cos(uTime * 0.5 + iA.w * 23.0) * 0.03;
  float e, vd;
  vec4 mv = atmosBillboard(c, position.xy, uSize * (0.5 + iA.w), e, vd);
  vUv = uv;
  float along = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.8, t) * pow(1.0 - t, 0.6);
  float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (1.3 + iA.w * 2.5) + iA.w * 40.0), 2.0);
  vB = e * along * (1.0 - 0.6 * iA.y) * tw;
  gl_Position = projectionMatrix * mv;
}`;

const DOT_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vB;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d2 = dot(p, p);
  float m = exp(-d2 * 5.0) * (1.0 - smoothstep(0.7, 1.0, d2));
  gl_FragColor = vec4(uColor * m * vB, 1.0);
}`;

const SRC_VERT = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
varying float vB;
${GLSL_BILLBOARD}
void main() {
  float e, vd;
  vec4 mv = atmosBillboard(vec3(0.0), position.xy, uSize, e, vd);
  vUv = uv;
  vB = 1.0;
  gl_Position = projectionMatrix * mv;
}`;

const SRC_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vB;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d2 = dot(p, p);
  float m = exp(-d2 * 18.0) * 1.6 + exp(-d2 * 4.0) * 0.35;
  m *= 1.0 - smoothstep(0.8, 1.0, d2);
  gl_FragColor = vec4(uColor * m, 1.0);
}`;

let hullGeo: THREE.CylinderGeometry | null = null;
/** closed unit frustum hull: y 0..1, rim radius 1 (scaled per-vertex by the shader) */
export const getShaftHull = () => {
  if (!hullGeo) {
    // 16 rings along the axis: the vertex shader flattens the hull onto the floor per vertex, so a coarse hull would
    // lift whole side faces above the floor (and wash the legs of a figure standing in a slanted beam)
    hullGeo = new THREE.CylinderGeometry(1, 1, 1, 48, 16, false);
    hullGeo.translate(0, 0.5, 0);
  }
  return hullGeo;
};
const QUAD = quadInstances(1, {});
const Y = new THREE.Vector3(0, 1, 0);
const BONE = new THREE.Color(S.bone);
const HSL = {h: 0, s: 0, l: 0};

/** volumetric frustum material (BackSide, additive). Uniforms: see GLSL_SHAFT_VOLUME. */
export const makeShaftVolumeMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uR0: {value: 0.1}, uR1: {value: 1}, uLen: {value: 1}, uColor: {value: new THREE.Color()}, uTime: {value: 0}, uFalloff: {value: 1},
      uSoft: {value: 1.4}, uStri: {value: 0.5}, uGround: {value: 0}, uGroundFade: {value: 0.35}, uSeed: {value: 1}, uNoise: {value: atmosNoise(1)},
    },
    vertexShader: VOL_VERT,
    fragmentShader: GLSL_SHAFT_VOLUME,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });

const additive = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false});

export const LightShaft: React.FC<LightShaftProps> = ({
  from, to, radiusStart = 0.15, radiusEnd = 1.6, color = S.bone, intensity = 1, time = 0, dust = 0, falloff = 1.0, softness = 1.4,
  striation = 0.5, source = 0, ground = 0, groundFade = 0.35, dustSize = 0.018, dustSpeed = 0.05, seed = 1, renderOrder = 4, ...group
}) => {
  const {size: vp} = useThree();
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = Math.max(1e-3, dir.length());
  const quat = new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize());
  const nDust = Math.max(0, Math.round(dust));

  const dustGeo = useMemo(() => {
    const A = new Float32Array(Math.max(1, nDust) * 4);
    for (let i = 0; i < nDust; i++) {
      const r = (k: string) => rand(`shaftDust|${seed}|${i}|${k}`);
      A.set([r('t'), r('r'), r('a'), r('p')], i * 4);
    }
    return quadInstances(nDust, {iA: [4, A]});
  }, [nDust, seed]);
  useLayoutEffect(() => () => dustGeo.dispose(), [dustGeo]);

  const mats = useMemo(() => {
    const vol = makeShaftVolumeMaterial();
    const dustM = additive(DUST_VERT, DOT_FRAG, {
      uR0: {value: 0.1}, uR1: {value: 1}, uLen: {value: 1}, uTime: {value: 0}, uSize: {value: 0.012}, uSpeed: {value: 0.05},
      uColor: {value: new THREE.Color()}, uViewH: {value: 1080}, uMinPx: {value: 1.3},
    });
    const src = additive(SRC_VERT, SRC_FRAG, {uSize: {value: 0.5}, uColor: {value: new THREE.Color()}, uViewH: {value: 1080}, uMinPx: {value: 2}});
    return {vol, dust: dustM, src};
  }, []);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useLayoutEffect(() => {
    const c = mats.vol.uniforms;
    c.uR0.value = Math.max(0.002, radiusStart);
    c.uR1.value = Math.max(0.002, radiusEnd);
    c.uLen.value = len;
    c.uColor.value.set(color).multiplyScalar(intensity);
    c.uTime.value = time;
    c.uFalloff.value = falloff;
    c.uSoft.value = softness;
    c.uStri.value = striation;
    c.uGround.value = ground;
    c.uGroundFade.value = groundFade;
    c.uSeed.value = seed;
    const d = mats.dust.uniforms;
    d.uR0.value = radiusStart;
    d.uR1.value = radiusEnd;
    d.uLen.value = len;
    d.uTime.value = time;
    d.uSize.value = dustSize;
    d.uSpeed.value = dustSpeed;
    // dust sparkles a little whiter than a grey/bone beam, but stays the beam's own hue in a saturated (red/gold)
    // beam — bone-lerped red dust would read PINK, and red pushed far over HDR 2 turns orange under ACES
    const sat = d.uColor.value.set(color).getHSL(HSL).s;
    d.uColor.value.lerp(BONE, 0.4 * (1 - sat)).multiplyScalar(intensity * (3.2 - 1.6 * sat));
    d.uViewH.value = vp.height;
    const s = mats.src.uniforms;
    s.uSize.value = Math.max(0.12, radiusStart * 3.5);
    s.uColor.value.set(color).multiplyScalar(intensity * source);
    s.uViewH.value = vp.height;
  });
  const on = intensity > 0;
  return (
    <group {...group}>
      <group position={from} quaternion={quat}>
        <mesh geometry={getShaftHull()} material={mats.vol} renderOrder={renderOrder} frustumCulled={false} visible={on} />
        {nDust > 0 ? <mesh geometry={dustGeo} material={mats.dust} renderOrder={renderOrder + 1} frustumCulled={false} visible={on} /> : null}
        {source > 0 ? <mesh geometry={QUAD} material={mats.src} renderOrder={renderOrder + 1} frustumCulled={false} visible={on} /> : null}
      </group>
    </group>
  );
};
