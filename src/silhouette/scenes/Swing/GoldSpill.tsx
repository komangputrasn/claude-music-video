/**
 * <GoldSpill> — LOCAL variant of the <Monolith> `spill` group (src/silhouette/lib/props/Monolith.tsx), for Swing.
 *
 * Why: on the Windows/ANGLE (D3D11) preview path the lib's spill renders NaN pixels: its SoftCone (`pow(vK, uFall)`)
 * and FloorGlow wedge (`pow(1.0 - k, 1.6)`) take pow() of an interpolated base that can land a hair below zero at the
 * mesh edge; HLSL pow(negative) = NaN, and the bloom pass smears that NaN over the whole frame (frames go black).
 * Here the same pieces are drawn with clamped bases. Same layout, colours and intensities as the lib (Monolith-local
 * coordinates; render it inside the Monolith's group and pass `spill={0}` to the <Monolith>).
 *
 *   <GoldSpill spill={0..1} shatter={0..1 (Monolith shatter clock)} seed?={1} halo?={1} cones?={1} front?={1}/>
 * `front` scales the forward cone alone. It is additive haze that runs from the open front toward +Z (room +X), so any
 * figure standing in front of the box from a camera on that side is veiled gold (Pancake reads brown, not black):
 * pass front={0} when the camera looks into the box's front past a silhouette.
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../../lib/palette';
import {MONOLITH, FloorGlow, GlowBillboard} from '../../lib/props';

type V3 = [number, number, number];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// Monolith dimensions (mirrors Monolith.tsx)
const W = 0.6, H = 0.85, D = 0.45, C = 0.16, T = 0.022, FOOT = 0.035;
const FZ = D / 2;
const BROW_Y0 = H - C;
const SIM = 1.6;

// ------------------------------------------------------------------------------------------------ interior card
const CARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CARD_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 0.85));
  float a = 0.35 + 0.65 * pow(max(0.0, 1.0 - r * 0.8), 1.6);
  a *= smoothstep(1.0, 0.75, max(abs(p.x), abs(p.y))) * 0.7 + 0.3;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
let cardGeo: THREE.PlaneGeometry | null = null;
const getCard = () => {
  if (cardGeo) return cardGeo;
  cardGeo = new THREE.PlaneGeometry(W - 2 * T, H - FOOT - 2 * T);
  cardGeo.translate(0, FOOT + T + (H - FOOT - 2 * T) / 2, -D / 2 + T + 0.004);
  return cardGeo;
};

// ------------------------------------------------------------------------------------------------ safe soft cone
const SC_VERT = /* glsl */ `
uniform mat4 uLocal;
uniform float uFloorY;
varying vec3 vN;
varying vec3 vV;
varying float vK;
varying float vH;
void main() {
  vK = uv.y;
  vH = (uLocal * vec4(position, 1.0)).y - uFloorY;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const SC_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uEdge, uFall, uOpacity, uFloorOn, uFloorSoft;
varying vec3 vN;
varying vec3 vV;
varying float vK;
varying float vH;
void main() {
  vec3 n = vN / max(length(vN), 1e-5);
  vec3 v = vV / max(length(vV), 1e-5);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float k = clamp(vK, 0.0, 1.0);
  float edge = pow(max(ndv, 1e-6), uEdge);
  float ax = pow(max(k, 1e-6), uFall) * (1.0 - smoothstep(0.9, 1.0, k));
  float a = edge * ax;
  if (uFloorOn > 0.5) a *= smoothstep(0.0, uFloorSoft, vH);
  if (!(a > 0.001)) discard;
  gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
}`;

const SafeCone: React.FC<{from: V3; to: V3; radiusStart: number; radiusEnd: number; intensity: number; edge: number; falloff: number;
  floorY?: number; floorSoft?: number}> = ({from, to, radiusStart, radiusEnd, intensity, edge, falloff, floorY, floorSoft = 0.25}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(radiusStart, radiusEnd, 1, 32, 1, true);
    g.translate(0, -0.5, 0);
    return g;
  }, [radiusStart, radiusEnd]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {value: new THREE.Color()}, uEdge: {value: 1.6}, uFall: {value: 1.4}, uOpacity: {value: 1},
          uLocal: {value: new THREE.Matrix4()}, uFloorY: {value: 0}, uFloorOn: {value: 0}, uFloorSoft: {value: 0.25},
        },
        vertexShader: SC_VERT,
        fragmentShader: SC_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = Math.max(1e-4, dir.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(S.dawnGold).multiplyScalar(Math.max(0, intensity) * 1.7);
    u.uEdge.value = edge;
    u.uFall.value = falloff;
    (u.uLocal.value as THREE.Matrix4).compose(a, q, new THREE.Vector3(1, len, 1));
    u.uFloorOn.value = floorY !== undefined ? 1 : 0;
    u.uFloorY.value = floorY ?? 0;
    u.uFloorSoft.value = Math.max(0.01, floorSoft);
  });
  if (intensity <= 0.0005) return null;
  return (
    <mesh geometry={geo} material={mat} position={from} rotation={[e.x, e.y, e.z]} scale={[1, len, 1]} renderOrder={4}
      userData={{silKeep: true}} frustumCulled={false} />
  );
};

// ------------------------------------------------------------------------------------------------ safe floor wedge
const FG_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FG_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uSoft, uBreak, uSeed, uNear, uFar;
varying vec2 vUv;
float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1, 0)), u.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float k = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
  float hw = mix(uNear, uFar, k);
  float e = abs(p.x) / max(hw, 1e-3);
  float a = (1.0 - smoothstep(1.0 - uSoft, 1.0, e)) * pow(max(1.0 - k, 1e-6), 1.6) * smoothstep(0.0, 0.04, k);
  float n = vn(vUv * 9.0) * 0.6 + vn(vUv * 23.0) * 0.4;
  a *= mix(1.0, 0.45 + 0.9 * n, uBreak);
  if (!(a > 0.002)) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
let wedgeGeo: THREE.PlaneGeometry | null = null;
const getWedge = () => {
  if (wedgeGeo) return wedgeGeo;
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  wedgeGeo = g;
  return g;
};

const SafeWedge: React.FC<{position: V3; size: [number, number]; intensity: number; near: number; far: number; softness: number;
  breakup: number; seed: number}> = ({position, size, intensity, near, far, softness, breakup, seed}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uColor: {value: new THREE.Color()}, uSoft: {value: 0.6}, uBreak: {value: 0.3}, uSeed: {value: 1}, uNear: {value: 0.45},
          uFar: {value: 1}},
        vertexShader: FG_VERT,
        fragmentShader: FG_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(S.dawnGold).multiplyScalar(Math.max(0, intensity));
    u.uSoft.value = Math.max(0.02, Math.min(1, softness));
    u.uBreak.value = breakup;
    u.uSeed.value = seed;
    u.uNear.value = near;
    u.uFar.value = far;
  });
  if (intensity <= 0.0005) return null;
  return (
    <group position={position}>
      <mesh geometry={getWedge()} material={mat} position={[0, 0.004, size[1] / 2]} scale={[size[0], 1, size[1]]} renderOrder={2}
        userData={{silKeep: true}} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ the spill
/** the lib's front-panel "fall" curve for the right half (the later one): how far the front has opened */
const frontOpenAt = (tau: number) => {
  const u = clamp01((tau - 0.13) / 0.62);
  return smooth01(u * u * 1.4);
};

export const GoldSpill: React.FC<{spill: number; shatter: number; seed?: number; halo?: number; cones?: number; front?: number}> = ({
  spill, shatter, seed = 1, halo = 1, cones = 1, front = 1,
}) => {
  const sp = clamp01(spill);
  const tau = clamp01(shatter) * SIM;
  const frontOpen = shatter > 0.0005 ? frontOpenAt(tau) : 0;
  const holeOpen = shatter > 0.0005 ? clamp01(tau / 0.25) : 0;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({uniforms: {uColor: {value: new THREE.Color()}}, vertexShader: CARD_VERT, fragmentShader: CARD_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    mat.uniforms.uColor.value.set(S.dawnGold).multiplyScalar(1.5 * sp);
  });
  if (sp <= 0.001) return null;
  return (
    <group userData={{silKeep: true}}>
      <mesh geometry={getCard()} material={mat} renderOrder={3} />
      <FloorGlow position={[0, FOOT + T, 0]} size={[W - 2 * T, D - 2 * T]} color={S.dawnGold} intensity={0.8 * sp} softness={0.5} breakup={0.2} />
      <GlowBillboard position={[0, 0.5, -D / 2 - 0.13]} color={S.dawnGold} intensity={halo * 0.34 * sp * (0.35 + 0.65 * Math.max(frontOpen, holeOpen))}
        size={1.2} falloff={1.7} floor={0.5} floorSoft={0.4} />
      <SafeCone from={[0, BROW_Y0 + 0.02, FZ - 0.08]} to={[0, 2.4, 0.32]} radiusStart={0.12} radiusEnd={0.6}
        intensity={cones * 0.3 * sp * holeOpen} edge={1.8} falloff={1.3} />
      <SafeCone from={[0, 0.46, 0.02]} to={[0, -0.12, 1.75]} radiusStart={0.28} radiusEnd={0.95}
        intensity={front * cones * 0.2 * sp * frontOpen} edge={1.6} falloff={1.1} floorY={0} floorSoft={0.3} />
      <SafeWedge position={MONOLITH.spillFloor as V3} size={[2.1, 2.5]} near={0.3} far={1} intensity={(0.2 + 1.05 * frontOpen) * sp}
        softness={0.55} breakup={0.4} seed={seed} />
    </group>
  );
};
