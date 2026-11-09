/**
 * <LightShaft> — a volumetric cone/shaft of light in fog: searchlights, red drone cones, window shafts, the single
 * light in the Hold scene (DESIGN-silhouette §2.3). An open cone from `from` (radiusStart) to `to` (radiusEnd) with
 * a soft radial profile (view-angle fade: the cone's outline is never a hard edge, its core is densest), a length
 * falloff, slow dust striations drifting along it, and optional dust motes floating inside. Additive, depthWrite off,
 * fog-free (it is light). Positions are in the parent's space (the group itself is NOT moved by from/to).
 *
 *   <LightShaft from={[0, 9, -2]} to={[0, 0, 0]} radiusStart?={0.15} radiusEnd?={1.6} color?={S.bone}
 *               intensity?={1} time?={0} dust?={0} falloff?={1.2} softness?={1.6} striation?={0.5}
 *               source?={0} dustSize?={0.012} dustSpeed?={0.05} seed?={1} {...group}/>
 *
 *   from / to        apex (the lamp) and the end of the beam, metres. Animate `to` to sweep a searchlight.
 *   radiusStart/End  beam radius at the lamp / at the end (m). radiusStart 0 = a point source.
 *   color            S.bone (window/searchlight), S.authRed (TENURE drones/scanners), dawnGold ONLY Final/Outro.
 *   intensity        HDR multiplier. The beam's on-axis brightness near the lamp ≈ color × intensity × ~1.5.
 *                    Beams MAY bloom (allowed: "only screens, beams, irises glow") — red stays ≤ 2.
 *   falloff          exponent of the fade along the length (higher = dies sooner); the far end always fades to 0.
 *   softness         exponent of the view-angle fade (higher = thinner, softer-edged beam).
 *   striation        0..1 strength of the faint lengthwise streaks (dust in the air), drifting with `time` (s).
 *   dust             number of instanced motes inside the cone (0 = none; 150–600 is good). One draw call. They
 *                    drift slowly along the beam (`dustSpeed` m/s) and are lit by it (brighter near the lamp).
 *   source           0..~3 brightness of a camera-facing glow sprite at the lamp (blooms: reads as the light itself).
 *
 * Usage
 *   <LightShaft from={[0, 12, 0]} to={[0, 0, 0]} radiusStart={0.2} radiusEnd={1.4} dust={300} time={t} />   // Hold
 *   <LightShaft from={[-4, 8, -6]} to={[x, 0, 0]} radiusEnd={1.2} color={S.authRed} intensity={1.4} source={1.5} time={t} />
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
  dustSize?: number;
  dustSpeed?: number;
  seed?: number;
  renderOrder?: number;
};

const CONE_VERT = /* glsl */ `
uniform float uR0, uR1, uLen;
varying float vT;
varying vec3 vN;
varying vec3 vV;
varying vec2 vRd;
void main() {
  float t = position.y;
  float r = mix(uR0, uR1, t);
  vec2 rd = normalize(position.xz + 1e-6);
  vec3 p = vec3(rd.x * r, t * uLen, rd.y * r);
  float k = (uR1 - uR0) / max(uLen, 1e-3);
  vec3 n = normalize(vec3(rd.x, -k, rd.y));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n);
  vV = -mv.xyz;
  vT = t;
  vRd = rd;
  gl_Position = projectionMatrix * mv;
}`;

const CONE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uLen, uTime, uFalloff, uSoft, uStri;
uniform sampler2D uNoise;
varying float vT;
varying vec3 vN;
varying vec3 vV;
varying vec2 vRd;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float soft = pow(facing, uSoft);
  float t = clamp(vT, 0.0, 1.0);
  float along = smoothstep(0.0, 0.035, t) * pow(1.0 - t, uFalloff) * (1.0 - smoothstep(0.75, 1.0, t) * 0.5);
  float ang = atan(vRd.y, vRd.x) / 6.2831853 + 0.5;
  float st = texture2D(uNoise, vec2(ang * 4.0, t * uLen * 0.035 - uTime * 0.025)).g;
  float st2 = texture2D(uNoise, vec2(ang * 2.0 + 0.3, t * uLen * 0.012 - uTime * 0.012)).r;
  float stri = mix(1.0, 0.45 + 1.1 * (st * 0.6 + st2 * 0.4), uStri);
  gl_FragColor = vec4(uColor * along * soft * stri * 0.75, 1.0);
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

let coneGeo: THREE.CylinderGeometry | null = null;
const getCone = () => {
  if (!coneGeo) {
    coneGeo = new THREE.CylinderGeometry(1, 1, 1, 64, 16, true);
    coneGeo.translate(0, 0.5, 0);
  }
  return coneGeo;
};
const QUAD = quadInstances(1, {});
const Y = new THREE.Vector3(0, 1, 0);

const additive = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, side: THREE.Side = THREE.FrontSide) =>
  new THREE.ShaderMaterial({uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side});

export const LightShaft: React.FC<LightShaftProps> = ({
  from, to, radiusStart = 0.15, radiusEnd = 1.6, color = S.bone, intensity = 1, time = 0, dust = 0, falloff = 1.2, softness = 1.6,
  striation = 0.5, source = 0, dustSize = 0.012, dustSpeed = 0.05, seed = 1, renderOrder = 4, ...group
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
    const cone = additive(CONE_VERT, CONE_FRAG, {
      uR0: {value: 0.1}, uR1: {value: 1}, uLen: {value: 1}, uColor: {value: new THREE.Color()}, uTime: {value: 0}, uFalloff: {value: 1.2},
      uSoft: {value: 1.6}, uStri: {value: 0.5}, uNoise: {value: atmosNoise(1)},
    }, THREE.DoubleSide);
    const dustM = additive(DUST_VERT, DOT_FRAG, {
      uR0: {value: 0.1}, uR1: {value: 1}, uLen: {value: 1}, uTime: {value: 0}, uSize: {value: 0.012}, uSpeed: {value: 0.05},
      uColor: {value: new THREE.Color()}, uViewH: {value: 1080}, uMinPx: {value: 1.3},
    });
    const src = additive(SRC_VERT, SRC_FRAG, {uSize: {value: 0.5}, uColor: {value: new THREE.Color()}, uViewH: {value: 1080}, uMinPx: {value: 2}});
    return {cone, dust: dustM, src};
  }, []);
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useLayoutEffect(() => {
    const c = mats.cone.uniforms;
    c.uR0.value = radiusStart;
    c.uR1.value = radiusEnd;
    c.uLen.value = len;
    c.uColor.value.set(color).multiplyScalar(intensity);
    c.uTime.value = time;
    c.uFalloff.value = falloff;
    c.uSoft.value = softness;
    c.uStri.value = striation;
    const d = mats.dust.uniforms;
    d.uR0.value = radiusStart;
    d.uR1.value = radiusEnd;
    d.uLen.value = len;
    d.uTime.value = time;
    d.uSize.value = dustSize;
    d.uSpeed.value = dustSpeed;
    d.uColor.value.set(color).lerp(new THREE.Color(S.bone), 0.35).multiplyScalar(intensity * 1.6);
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
        <mesh geometry={getCone()} material={mats.cone} renderOrder={renderOrder} frustumCulled={false} visible={on} />
        {nDust > 0 ? <mesh geometry={dustGeo} material={mats.dust} renderOrder={renderOrder + 1} frustumCulled={false} visible={on} /> : null}
        {source > 0 ? <mesh geometry={QUAD} material={mats.src} renderOrder={renderOrder + 1} frustumCulled={false} visible={on} /> : null}
      </group>
    </group>
  );
};
