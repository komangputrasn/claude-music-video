/**
 * <PillowIris> — the pillow with TENURE inside it (DESIGN-silhouette §3, §4 V1Bedroom "SLEEP · METERED", Hold "Is that you?"):
 * a soft, plump pillow SILHOUETTE with a red iris INSIDE it. Closed, a thin red seam glows in the fabric; as `open` rises
 * the fabric parts like eyelids and the iris opens; red light bleeds through the cloth around it. `talk` makes the iris
 * dilate and pulse like speech (TENURE's voice in his bed).
 *
 *   <PillowIris open?={0} talk?={0} time?={t} pupil?={0.3} intensity?={1.5} glow?={0.6} irisAt?={0.22}
 *               rim?={null} color?={S.void} fog?={true} {...group}/>
 *
 *   open       0 closed (a faint red seam) … 0.45 lids apart … 1 iris fully open. Animate slowly (2–4 s).
 *   talk       0..1 speech: syllable-rate pupil dilation + intensity pulse (deterministic from `time`). Use ~0.8 while a
 *              line is "spoken"; 0 in silence. Pass song seconds as `time`.
 *   pupil      resting pupil size (fraction of the iris radius).
 *   intensity  red HDR of the iris (≤ 2 — hotter red tone-maps orange = reads gold).
 *   glow       red light bleeding through the fabric around the iris (0 = none). Scales with open + talk.
 *   irisAt     where the eye sits along the pillow's depth: 0 = centre of the top, 0.4 = toward the +Z (front) edge.
 *              Default 0.22 so a camera at the foot of the bed (+Z, a little above) sees it nearly face-on.
 *   rim/color/fog   forwarded to the pillow's <Silhouette> (give a thin rim toward the light so the pillow's soft outline reads).
 *
 * Frame: origin = base centre (the pillow rests on y = 0, e.g. a mattress top); long side along X (0.66 m), depth along Z
 * (0.46 m), 0.125 m tall at the crown; the iris lies ON the top surface (normal ≈ +Y tilted toward +Z), its "up" toward −Z.
 * For a pillow propped against a headboard rotate the group about X with a POSITIVE angle (three.js: +X rotation turns
 * +Y toward +Z): rotation-x={1.1} stands it up, base toward −Z (the headboard), iris toward +Z (the eye then sits in the
 * lower half — irisAt={0} centres it; Hold uses rotation-x={π/2 + tilt} with irisAt 0). A NEGATIVE angle turns the eye
 * toward −Z, away from a camera at the foot of the bed (verified: at rotation-x −1.1 that camera sees only the underside).
 * PILLOW = {size, top, irisCenter, irisNormal, irisRadius}. The iris and glow are userData.silKeep (they keep glowing
 * inside a parent <Silhouette>). Near-silence (Hold 162–166 s): keep `talk` at 0 except for "Is that you?", nothing else moves.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {IRIS_GLSL} from '../Iris';
import {RimOpts, Silhouette} from '../Silhouette';
import {noise1} from '../../../lib/time';
import {GroupProps, V3, clamp01, smooth01} from './shared';

const A = 0.33, B = 0.23, HT = 0.085, HB = 0.04, IR = 0.072;

const surf = (u: number, v: number, top: boolean): V3 => {
  const x = A * u * (1 - 0.07 * (1 - v * v));
  const z = B * v * (1 - 0.09 * (1 - u * u));
  const f = Math.sqrt(Math.max(0, 1 - u * u)) * Math.sqrt(Math.max(0, 1 - v * v));
  const y = top ? HT * Math.pow(f, 0.75) : -HB * Math.pow(f, 0.55);
  return [x, y + HB, z];
};
/** top-surface height at (x, z) (inverts the pinched mapping with two fixed-point steps) */
const topY = (x: number, z: number) => {
  let u = x / A, v = z / B;
  for (let i = 0; i < 3; i++) {
    u = x / (A * (1 - 0.07 * (1 - v * v)));
    v = z / (B * (1 - 0.09 * (1 - u * u)));
  }
  return surf(Math.max(-0.999, Math.min(0.999, u)), Math.max(-0.999, Math.min(0.999, v)), true)[1];
};
const topNormal = (x: number, z: number) => {
  const e = 0.004;
  const dx = (topY(x + e, z) - topY(x - e, z)) / (2 * e), dz = (topY(x, z + e) - topY(x, z - e)) / (2 * e);
  return new THREE.Vector3(-dx, 1, -dz).normalize();
};

let pillowGeo: THREE.BufferGeometry | null = null;
const getPillow = () => {
  if (pillowGeo) return pillowGeo;
  const nu = 40, nv = 30;
  const pos: number[] = [], idx: number[] = [];
  const grid = (top: boolean) => {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const v = Math.sin((Math.PI / 2) * (-1 + (2 * j) / nv));
      for (let i = 0; i <= nu; i++) {
        const u = Math.sin((Math.PI / 2) * (-1 + (2 * i) / nu));
        pos.push(...surf(u, v, top));
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        if (top) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    }
  };
  grid(true);
  grid(false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  pillowGeo = g;
  return g;
};

/** square patch (2r × 2r) draped on the top surface around (0, zc); uv 0..1 across it, uv.y up = toward −Z */
const drape = (r: number, zc: number, lift: number, seg = 24) => {
  const g = new THREE.PlaneGeometry(2 * r, 2 * r, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + zc;
    p.setXYZ(i, x, topY(x, z) + lift, z);
  }
  g.computeVertexNormals();
  return g;
};

const IRIS_Z = (at: number) => B * at;

export const PILLOW = {
  size: [2 * A, HB + HT, 2 * B] as V3,
  top: HB + HT,
  irisRadius: IR,
  /** iris centre for the default irisAt (0.22) */
  irisCenter: [0, topY(0, IRIS_Z(0.22)), IRIS_Z(0.22)] as V3,
  irisNormal: topNormal(0, IRIS_Z(0.22)).toArray() as V3,
};

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const IRIS_FRAG = /* glsl */ `
uniform vec3 uColor, uGlint;
uniform float uOpen, uPupil, uTime, uLid, uSeam;
varying vec2 vUv;
${IRIS_GLSL}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float ax = abs(p.x);
  if (ax > 1.0) discard;
  float hgt = uLid * pow(max(0.0, 1.0 - ax * ax), 0.62) * 1.04;
  float aa = fwidth(p.y) * 1.5 + 1e-4;
  float inside = 1.0 - smoothstep(hgt - aa, hgt + aa, abs(p.y));
  float edgeD = abs(abs(p.y) - hgt);
  float seam = (1.0 - smoothstep(0.0, 0.045 + aa, edgeD)) * pow(max(0.0, 1.0 - ax * ax), 1.3);
  vec4 k = irisLayers(p, uOpen, uPupil, uTime);
  vec3 col = (uColor * k.x + uGlint * k.z) * inside;
  float aIn = inside * max(k.y, clamp(k.x, 0.0, 1.0));
  col += uColor * seam * uSeam;
  float alpha = max(aIn, clamp(seam * uSeam, 0.0, 1.0));
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(col, alpha);
}`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 1.25));
  float a = pow(max(0.0, 1.0 - r), 2.2);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

export type PillowIrisProps = GroupProps & {
  open?: number;
  talk?: number;
  time?: number;
  pupil?: number;
  intensity?: number;
  glow?: number;
  irisAt?: number;
  rim?: RimOpts | null;
  color?: string;
  fog?: boolean;
};

/** speech envelope 0..1 from time (syllables ~4.6 Hz gated by slower word groups) */
export const pillowSpeech = (t: number) => {
  const syl = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 4.6 + 2.2 * noise1(t * 1.3, 41));
  const words = Math.max(0, Math.min(1, 0.55 + 0.9 * noise1(t * 1.9, 42)));
  return syl * words;
};

export const PillowIris: React.FC<PillowIrisProps> = ({
  open = 0, talk = 0, time = 0, pupil = 0.3, intensity = 1.5, glow = 0.6, irisAt = 0.22, rim = null, color = S.void, fog = true,
  ...group
}) => {
  const pillow = getPillow();
  const zc = IRIS_Z(irisAt);
  const irisGeo = useMemo(() => drape(IR, zc, 0.0022), [zc]);
  const glowGeo = useMemo(() => drape(IR * 2.9, zc, 0.0012, 20), [zc]);
  useLayoutEffect(() => () => {
    irisGeo.dispose();
    glowGeo.dispose();
  }, [irisGeo, glowGeo]);
  const mats = useMemo(() => {
    const iris = new THREE.ShaderMaterial({
      uniforms: {
        uColor: {value: new THREE.Color()}, uGlint: {value: new THREE.Color()}, uOpen: {value: 0}, uPupil: {value: 0.3},
        uTime: {value: 0}, uLid: {value: 0}, uSeam: {value: 0},
      },
      vertexShader: VERT, fragmentShader: IRIS_FRAG, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const glowM = new THREE.ShaderMaterial({
      uniforms: {uColor: {value: new THREE.Color()}}, vertexShader: VERT, fragmentShader: GLOW_FRAG, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    return {iris, glowM};
  }, []);
  useLayoutEffect(() => () => {
    mats.iris.dispose();
    mats.glowM.dispose();
  }, [mats]);
  const o = clamp01(open);
  const env = clamp01(talk) * pillowSpeech(time);
  useLayoutEffect(() => {
    const u = mats.iris.uniforms;
    const lid = smooth01(o / 0.55);
    const irisOpen = smooth01((o - 0.12) / 0.88);
    const I = Math.min(2, intensity * (1 + 0.32 * env));
    u.uColor.value.set(S.authRed).multiplyScalar(I);
    u.uGlint.value.set(S.bone).multiplyScalar(1.3 * irisOpen);
    u.uOpen.value = irisOpen;
    u.uPupil.value = Math.min(0.8, pupil + 0.2 * env);
    u.uTime.value = time;
    u.uLid.value = lid;
    u.uSeam.value = 0.7 * (1 - lid * 0.85) + 0.25 * env;
    mats.glowM.uniforms.uColor.value.set(S.authRed).multiplyScalar(glow * (0.12 + 0.6 * o + 0.5 * env));
  });
  return (
    <group {...group}>
      <Silhouette color={color} rim={rim} fog={fog}>
        <mesh geometry={pillow} />
      </Silhouette>
      <group userData={{silKeep: true}}>
        {glow > 0 ? <mesh geometry={glowGeo} material={mats.glowM} renderOrder={2} /> : null}
        <mesh geometry={irisGeo} material={mats.iris} renderOrder={3} />
      </group>
    </group>
  );
};

export default PillowIris;
