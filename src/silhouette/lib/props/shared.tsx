/**
 * props/shared — internals shared by the TERMS hero props (no hero props here).
 *
 *   GroupProps, V3                     prop helper types (group props without children; 3-tuples)
 *   clamp01, smooth01, easeOut, seg    scalar helpers (seg(x, a, b) = clamp01((x-a)/(b-a)))
 *   hash(i, k, seed)                   fast integer hash → [0,1) (deterministic, no Math.random; for per-particle tables)
 *   basisEuler(x, y, z)                Euler that maps the local X/Y/Z axes onto the given (orthonormal) vectors
 *   GRIP                               grip-frame rotations matching src/lib/props/Held.tsx (hammer, phone, book)
 *   useCanvasTex(w, h, draw, deps)     CanvasTexture redrawn only when deps change (re-export of the Y2K engine helper)
 *   <GlowBillboard>                    camera-facing soft glow sprite (additive, HDR, fog-free, no depth write)
 *   <FloorGlow>                        soft light decal lying on the floor: 'radial' pool or 'wedge' spill from a door/box
 *   <SoftCone>                         cheap volumetric light cone (additive frustum drawn from its BACK faces only, so a
 *                                      silhouette inside or in front of it is a clean pure-black cut-out; soft edges)
 *   makeRimMat(base, rim)              silhouette material with a fresnel edge (= core makeSilhouetteMaterial), silKeep-able
 *   isControlWord(w)                   true for words that must read authRed (palette RED_WORDS + 'cancelled' variants)
 *
 * All materials here are built once per component instance (useMemo) and their uniforms are written in useLayoutEffect.
 * Brightness is LINEAR HDR (the <SilStage> chain tone-maps in its OutputPass; bloom threshold ≈ 0.86 luminance).
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useCanvasTexture} from '../../../lib/props/Padlock';
import {makeSilhouetteMaterial, RimOpts} from '../Silhouette';
import {RED_WORDS, S} from '../palette';

export type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number, k = 3) => 1 - Math.pow(1 - clamp01(x), k);
export const seg = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Fast deterministic hash of (i, k, seed) → [0, 1). Use for large per-particle tables (rand() is slower). */
export const hash = (i: number, k = 0, seed = 0) => {
  let h = (Math.imul(i + 1, 374761393) + Math.imul(k + 7, 668265263) + Math.imul(seed + 13, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export const basisEuler = (x: V3, y: V3, z: V3): V3 => {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  const e = new THREE.Euler().setFromRotationMatrix(m);
  return [e.x, e.y, e.z];
};

/** Grip-frame rotations — identical to src/lib/props/Held.tsx so the Y2K pose helpers line up. */
export const GRIP = {
  /** prop +Y (handle) → grip +Z, prop +X (striking face) → grip −Y, prop +Z → grip −X */
  hammer: basisEuler([0, -1, 0], [0, 0, 1], [-1, 0, 0]),
  /** prop +X → grip +Z, prop +Y (hinge/earpiece) → grip −Y (fingertips), prop +Z (keypad/screen) → grip +X (palm) */
  phone: basisEuler([0, 0, 1], [0, -1, 0], [1, 0, 0]),
  /** book/e-reader for guyHoldUp: flip about X — prop +Y → grip −Y (fingertips), prop +Z (cover/screen) → grip −Z */
  book: [Math.PI, 0, 0] as V3,
};

export const useCanvasTex = useCanvasTexture;

const CONTROL = new Set<string>([...RED_WORDS, 'cancelled', 'canceled', 'revoked', 'locked', 'denied', 'expired', 'plus']);
export const isControlWord = (w: string) => CONTROL.has(w.toLowerCase().replace(/[^a-z]/g, ''));

// ------------------------------------------------------------------------------------------------ glow billboard
const BB_VERT = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  float s = length(modelMatrix[0].xyz);
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize * s * 2.0;
  gl_Position = projectionMatrix * mv;
}`;
const BB_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFall, uCore, uOpacity, uStretch;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x /= max(uStretch, 1e-3);
  float r = length(p);
  if (r > 1.0) discard;
  float a = pow(1.0 - r, uFall);
  a += uCore * pow(1.0 - r, 14.0);
  gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
}`;
const BB_GEO = new THREE.PlaneGeometry(1, 1);

export type GlowBillboardProps = GroupProps & {
  /** HDR colour = color × intensity */
  color?: string;
  intensity?: number;
  /** radius in metres (scaled by the group's scale) */
  size?: number;
  /** falloff exponent (higher = tighter) */
  falloff?: number;
  /** extra hot core (blooms) */
  core?: number;
  /** horizontal stretch (>1 = wider ellipse in screen space) */
  stretch?: number;
  renderOrder?: number;
};
/** Camera-facing soft glow (additive, fog-free, depthWrite off). Skipped when intensity ≤ 0. Origin = its centre. */
export const GlowBillboard: React.FC<GlowBillboardProps> = ({
  color = S.bone, intensity = 1, size = 0.5, falloff = 2.2, core = 0, stretch = 1, renderOrder = 5, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {value: new THREE.Color()}, uSize: {value: 1}, uFall: {value: 2}, uCore: {value: 0}, uOpacity: {value: 1},
          uStretch: {value: 1},
        },
        vertexShader: BB_VERT,
        fragmentShader: BB_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(Math.max(0, intensity));
    u.uSize.value = size;
    u.uFall.value = falloff;
    u.uCore.value = core;
    u.uStretch.value = stretch;
  });
  if (intensity <= 0.0005) return null;
  return (
    <group {...group}>
      <mesh geometry={BB_GEO} material={mat} frustumCulled={false} renderOrder={renderOrder} userData={{silKeep: true}} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ floor glow
const FG_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FG_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uShape, uSoft, uBreak, uSeed, uNear, uFar, uOpacity;
varying vec2 vUv;
float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1, 0)), u.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;   // x: -1..1 across, y: -1 (near edge / source) .. 1 (far)
  float a;
  if (uShape < 0.5) {
    // radial pool
    float r = length(p);
    a = 1.0 - smoothstep(1.0 - uSoft, 1.0, r);
    a *= mix(1.0, 1.0 - r * 0.6, 0.6);
  } else {
    // wedge: starts uNear wide at the source edge, uFar wide at the far edge; brightest at the source
    float k = p.y * 0.5 + 0.5;
    float hw = mix(uNear, uFar, k);
    float e = abs(p.x) / max(hw, 1e-3);
    a = (1.0 - smoothstep(1.0 - uSoft, 1.0, e)) * pow(1.0 - k, 1.6) * smoothstep(0.0, 0.04, k);
  }
  float n = vn(vUv * 9.0) * 0.6 + vn(vUv * 23.0) * 0.4;
  a *= mix(1.0, 0.45 + 0.9 * n, uBreak);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
}`;
const FG_GEO = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2); // lies on y = 0; uv.y grows toward −Z … flip so it grows toward +Z
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  return g;
})();

export type FloorGlowProps = GroupProps & {
  color?: string;
  intensity?: number;
  /** 'radial' = ellipse pool centred on the origin; 'wedge' = spill starting at the origin edge going toward +Z */
  shape?: 'radial' | 'wedge';
  /** [width (X), depth (Z)] metres */
  size?: [number, number];
  softness?: number;
  /** 0..1 noise breakup (kills the CG disc look) */
  breakup?: number;
  /** wedge only: half-width fraction at the source edge and at the far edge (0..1 of size[0]/2) */
  near?: number;
  far?: number;
  seed?: number;
  /** height above the floor to avoid z-fighting (default 0.004) */
  lift?: number;
  renderOrder?: number;
};
/**
 * Additive light decal on the floor (y = lift). 'radial': origin = pool centre. 'wedge': origin = the middle of the
 * SOURCE edge (e.g. the bottom of a broken box's opening) and the spill runs toward +Z for size[1] metres.
 */
export const FloorGlow: React.FC<FloorGlowProps> = ({
  color = S.bone, intensity = 1, shape = 'radial', size = [2, 2], softness = 0.6, breakup = 0.35, near = 0.45, far = 1,
  seed = 1, lift = 0.004, renderOrder = 2, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: {value: new THREE.Color()}, uShape: {value: 0}, uSoft: {value: 0.6}, uBreak: {value: 0.3}, uSeed: {value: 1},
          uNear: {value: 0.45}, uFar: {value: 1}, uOpacity: {value: 1},
        },
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
    u.uColor.value.set(color).multiplyScalar(Math.max(0, intensity));
    u.uShape.value = shape === 'wedge' ? 1 : 0;
    u.uSoft.value = Math.max(0.02, Math.min(1, softness));
    u.uBreak.value = breakup;
    u.uSeed.value = seed;
    u.uNear.value = near;
    u.uFar.value = far;
  });
  if (intensity <= 0.0005) return null;
  const zOff = shape === 'wedge' ? size[1] / 2 : 0;
  return (
    <group {...group}>
      <mesh geometry={FG_GEO} material={mat} position={[0, lift, zOff]} scale={[size[0], 1, size[1]]} renderOrder={renderOrder}
        userData={{silKeep: true}} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ soft cone
const SC_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vK;
void main() {
  vK = uv.y;                       // 0 at the far (wide) end … 1 at the source
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const SC_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uEdge, uFall, uOpacity;
varying vec3 vN;
varying vec3 vV;
varying float vK;
void main() {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float edge = pow(ndv, uEdge);
  float ax = pow(vK, uFall) * (1.0 - smoothstep(0.9, 1.0, vK));
  float a = edge * ax;
  if (a < 0.001) discard;
  gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
}`;

export type SoftConeProps = GroupProps & {
  /** source point (parent space) */
  from: V3;
  /** end point of the axis (parent space) */
  to: V3;
  radiusStart?: number;
  radiusEnd?: number;
  color?: string;
  intensity?: number;
  /** edge softness exponent (higher = softer/thinner looking edges) */
  edge?: number;
  /** axial falloff exponent (higher = fades sooner) */
  falloff?: number;
  renderOrder?: number;
};
/**
 * Cheap volumetric cone of light: additive, drawn from its BACK faces only (so silhouettes inside it stay pure black, the
 * same trick as atmos <LightShaft>), soft view-angle edges, fades from `from` to `to`. Origin: `from`/`to` in parent space.
 */
export const SoftCone: React.FC<SoftConeProps> = ({
  from, to, radiusStart = 0.1, radiusEnd = 0.8, color = S.bone, intensity = 0.3, edge = 1.6, falloff = 1.4, renderOrder = 4,
  ...group
}) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(radiusStart, radiusEnd, 1, 32, 1, true);
    g.translate(0, -0.5, 0); // top (source) at y = 0, far end at y = -1
    return g;
  }, [radiusStart, radiusEnd]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {uColor: {value: new THREE.Color()}, uEdge: {value: 1.6}, uFall: {value: 1.4}, uOpacity: {value: 1}},
        vertexShader: SC_VERT,
        fragmentShader: SC_FRAG,
        transparent: true,
        depthWrite: false,
        // back faces only: anything inside the cone (or in front of its far wall) occludes the whole ray → black cut-out
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uColor.value.set(color).multiplyScalar(Math.max(0, intensity) * 1.7);
    u.uEdge.value = edge;
    u.uFall.value = falloff;
  });
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = Math.max(1e-4, dir.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  if (intensity <= 0.0005) return null;
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} position={from} rotation={[e.x, e.y, e.z]} scale={[1, len, 1]} renderOrder={renderOrder}
        userData={{silKeep: true}} frustumCulled={false} />
    </group>
  );
};

// ------------------------------------------------------------------------------------------------ rim material
/** A silhouette material (flat `base`) with a fresnel edge light — for the hammer's dawnGold handle edge etc. */
export const makeRimMat = (base: string, rim: RimOpts | null, fog = true) => makeSilhouetteMaterial(base, rim, fog, 1);
