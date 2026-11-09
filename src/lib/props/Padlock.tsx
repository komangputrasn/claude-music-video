/**
 * Padlock — chunky, iconic red body + chrome shackle + keyhole. Reused everywhere (subscription locks, feeder, printer...).
 * ALSO hosts the SHARED PROP HELPERS used by every file in src/lib/props (gloss-toon material, chrome, candy plastic,
 * rounded boxes, ink outlines, canvas textures, prop time).
 *
 * <Padlock open? shake? broken? time? color? {...groupProps}/>
 *   open    0..1  shackle lifts (0..0.6) then swings back around the long leg (0.6..1)
 *   shake   0..1  rattle amplitude (deterministic jitter driven by `time`)
 *   broken  0..1  shackle snaps and flies off, body cracks + tilts, chips fly
 *   time    seconds used for the shake phase (defaults to useCurrentFrame()/fps)
 *   color   body colour (default alertRed). e.g. gold '#F5C542' for a "PLUS tier" lock.
 * Origin: CENTRE OF THE BODY. Faces +Z. Size ≈ 7 cm wide, 9.7 cm tall (body + shackle). Scale freely for icons.
 * Anchors: PADLOCK.body (size), PADLOCK.shackleInnerTop (y where a staple/hasp bar rests), PADLOCK.bottomY, PADLOCK.height.
 *
 * Example:
 *   <Padlock position={[0, 1.2, 0]} scale={4} shake={beat.pulse} />
 *
 * Shared helpers (import from './Padlock' inside this folder, or from 'lib/props'):
 *   glossMat(color, opts)      cached cel-shaded toon material + hard specular glint + optional rim light
 *   makeGlossMat(color, opts)  uncached variant (use when passing a per-instance `map`)
 *   chromeMat(color?, rough?)  env-reflective chrome (needs <Stage env> other than 'none')
 *   candyMat(color, opacity)   translucent glossy candy plastic (Bondi-blue lid etc.)
 *   rbox(w,h,d,r,seg?)         cached RoundedBoxGeometry
 *   rrectShape(w,h,r)          centred rounded-rect THREE.Shape
 *   hullOf(geo)                cached smooth-normal copy of a geometry (gap-free ink outlines on boxes)
 *   <Ink geometry material outline? silhouette? .../>   mesh + inverted-hull ink outline
 *   useCanvasTexture(w,h,draw,deps,opts)  CanvasTexture redrawn only when deps change
 *   usePropTime(time?)         seconds (prop value, else current frame / fps)
 *   makeGlowMat(color)         additive fresnel shell material (legendary aura)
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {ThreeElements} from '@react-three/fiber';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {OUTLINE, TOON_GRADIENT, outlineMat} from '../characters/toon';
import {C} from '../palette';

export type GroupProps = ThreeElements['group'];
type MeshProps = ThreeElements['mesh'];

// =====================================================================================================================
// Shared prop helpers
// =====================================================================================================================

/** Ink outline thicknesses tuned for hand-held props (object-space metres). */
export const PROP_INK = {color: OUTLINE.color, hair: 0.0009, thin: 0.0014, mid: 0.0022, thick: 0.0035, big: 0.005};

export type GlossOpts = {
  /** hard specular glint strength (0 = plain toon). default 0.22 */
  spec?: number;
  /** glint size: N·H threshold, higher = smaller glint. default 0.975 */
  edge?: number;
  /** fresnel rim light strength. default 0 */
  rim?: number;
  rimColor?: string;
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  flat?: boolean;
  alphaTest?: number;
  depthWrite?: boolean;
  polygonOffset?: number;
};

const GLOSS_PARS = /* glsl */ `
uniform float uSpec;
uniform float uSpecEdge;
uniform float uRim;
uniform vec3 uRimColor;
varying vec3 vViewPosition;
struct ToonMaterial { vec3 diffuseColor; };
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
  vec3 hv = normalize( directLight.direction + geometryViewDir );
  float nh = max( dot( geometryNormal, hv ), 0.0 );
  float sp = smoothstep( uSpecEdge - 0.005, uSpecEdge + 0.005, nh );
  reflectedLight.directSpecular += directLight.color * sp * uSpec;
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Toon
#define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
`;
const OUT_LINE = 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;';
const OUT_GLOSS = `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance + reflectedLight.directSpecular;
  float rimF = 1.0 - max( dot( normal, normalize( vViewPosition ) ), 0.0 );
  outgoingLight += uRimColor * uRim * smoothstep( 0.6, 0.92, rimF );`;

/** Uncached gloss-toon material. Uniforms live in material.userData.u (uSpec, uSpecEdge, uRim, uRimColor) — mutate freely. */
export const makeGlossMat = (color: string, o: GlossOpts = {}) => {
  const m = new THREE.MeshToonMaterial({color, gradientMap: TOON_GRADIENT});
  if (o.map) m.map = o.map;
  if (o.emissive) {
    m.emissive = new THREE.Color(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  if (o.emissiveMap) m.emissiveMap = o.emissiveMap;
  if (o.transparent || (o.opacity ?? 1) < 1) {
    m.transparent = true;
    m.opacity = o.opacity ?? 1;
  }
  if (o.side !== undefined) m.side = o.side;
  if (o.flat) (m as unknown as {flatShading: boolean}).flatShading = true;
  if (o.alphaTest) m.alphaTest = o.alphaTest;
  if (o.depthWrite === false) m.depthWrite = false;
  if (o.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -o.polygonOffset;
    m.polygonOffsetUnits = -o.polygonOffset;
  }
  const u = {
    uSpec: {value: o.spec ?? 0.22},
    uSpecEdge: {value: o.edge ?? 0.975},
    uRim: {value: o.rim ?? 0},
    uRimColor: {value: new THREE.Color(o.rimColor ?? '#ffffff')},
  };
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_toon_pars_fragment>', GLOSS_PARS).replace(OUT_LINE, OUT_GLOSS);
  };
  return m;
};

const glossCache = new Map<string, THREE.MeshToonMaterial>();
/** Cached gloss-toon material (no texture maps — use makeGlossMat for those). */
export const glossMat = (color: string, o: Omit<GlossOpts, 'map' | 'emissiveMap'> = {}) => {
  const key = JSON.stringify([color, o]);
  let m = glossCache.get(key);
  if (!m) {
    m = makeGlossMat(color, o);
    glossCache.set(key, m);
  }
  return m;
};

const chromeCache = new Map<string, THREE.MeshStandardMaterial>();
/** Env-reflective chrome. Looks best under <Stage env="chrome"> (default). */
export const chromeMat = (color: string = C.chrome, roughness = 0.16) => {
  const key = `${color}|${roughness}`;
  let m = chromeCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({color, metalness: 1, roughness, envMapIntensity: 1.3});
    chromeCache.set(key, m);
  }
  return m;
};

const candyCache = new Map<string, THREE.MeshPhysicalMaterial>();
/** Translucent glossy candy plastic (iMac-era). Double sided, no depth write. */
export const candyMat = (color: string, opacity = 0.5) => {
  const key = `${color}|${opacity}`;
  let m = candyCache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
      side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.75, emissive: new THREE.Color(color), emissiveIntensity: 0.1,
    });
    candyCache.set(key, m);
  }
  return m;
};

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit flat colour (keyholes, LCD segments, ink details). */
export const flatMat = (color: string, toneMapped = true) => {
  const key = `${color}|${toneMapped}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({color, toneMapped});
    basicCache.set(key, m);
  }
  return m;
};

const rboxCache = new Map<string, THREE.BufferGeometry>();
/** Cached rounded box, centred on the origin. */
export const rbox = (w: number, h: number, d: number, r: number, seg = 3) => {
  const key = `${w}|${h}|${d}|${r}|${seg}`;
  let g = rboxCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rboxCache.set(key, g);
  }
  return g;
};

/** Centred rounded-rectangle shape. */
export const rrectShape = (w: number, h: number, r: number, cx = 0, cy = 0) => {
  const s = new THREE.Shape();
  const x0 = cx - w / 2, y0 = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
};

const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
/** Smooth-normal copy of a geometry (vertices welded) so inverted-hull outlines have no cracks at hard edges. */
export const hullOf = (geo: THREE.BufferGeometry) => {
  let h = hullCache.get(geo);
  if (!h) {
    const g = geo.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
    h = mergeVertices(g, 1e-5);
    h.computeVertexNormals();
    hullCache.set(geo, h);
  }
  return h;
};

const silCache = new Map<string, THREE.ShaderMaterial>();
/** Outline material for TRANSLUCENT meshes: only the silhouette band is drawn (far back faces are discarded). */
export const silhouetteOutlineMat = (thickness: number, color: string = OUTLINE.color) => {
  const key = `${thickness}|${color}`;
  let m = silCache.get(key);
  if (!m) {
    m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {uT: {value: thickness}, uC: {value: new THREE.Color(color)}},
      vertexShader: `uniform float uT; varying float vF;
        void main(){ vec3 p = position + normalize(normal) * uT; vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vec3 n = normalize(normalMatrix * normal); vF = dot(n, normalize(-mv.xyz)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uC; varying float vF; void main(){ if (vF < -0.32) discard; gl_FragColor = vec4(uC, 1.0); }`,
    });
    silCache.set(key, m);
  }
  return m;
};

const noRaycast = () => null;
export type InkProps = Omit<MeshProps, 'geometry' | 'material' | 'children'> & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  /** outline thickness (object-space metres); false = none. default PROP_INK.mid */
  outline?: number | false;
  outlineColor?: string;
  /** use the silhouette-only outline (for translucent materials) */
  silhouette?: boolean;
  children?: React.ReactNode;
};
/** Mesh + gap-free inverted-hull ink outline. */
export const Ink: React.FC<InkProps> = ({geometry, material, outline = PROP_INK.mid, outlineColor = OUTLINE.color, silhouette, children, ...rest}) => (
  <mesh geometry={geometry} material={material} {...rest}>
    {outline ? (
      <mesh
        geometry={hullOf(geometry)}
        material={silhouette ? silhouetteOutlineMat(outline, outlineColor) : outlineMat(outline, outlineColor)}
        raycast={noRaycast}
      />
    ) : null}
    {children}
  </mesh>
);

/**
 * CanvasTexture that is (re)drawn in useLayoutEffect only when `deps` change. The canvas is cleared before `draw`.
 * pixelated: nearest-neighbour magnification (LCD / pixel fonts).
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: React.DependencyList,
  opts: {pixelated?: boolean} = {},
) {
  const pixelated = !!opts.pixelated;
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (pixelated) {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }
    return t;
  }, [width, height, pixelated]);
  useLayoutEffect(() => {
    const canvas = tex.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
    ctx.restore();
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, ...deps]);
  useLayoutEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Seconds for jitter/shake phases: the `time` prop if given, else the current (scene-local) frame / fps. */
export const usePropTime = (time?: number) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return time ?? f / fps;
};

/** Additive fresnel shell (used for "legendary item" auras). Uniforms: uC colour, uI intensity, uT push-out. */
export const makeGlowMat = (color: string, push = 0.004) =>
  new THREE.ShaderMaterial({
    uniforms: {uC: {value: new THREE.Color(color)}, uI: {value: 0}, uT: {value: push}},
    vertexShader: `uniform float uT; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 p = position + normalize(normal) * uT; vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uI; varying vec3 vN; varying vec3 vV;
      void main(){ float f = clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0); float a = pow(f, 2.4) * uI;
        gl_FragColor = vec4(uC * a, 1.0); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

/** Ease helpers (pure). */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

// =====================================================================================================================
// Padlock
// =====================================================================================================================

const BODY_W = 0.07, BODY_H = 0.058, BODY_D = 0.03;
const ARC_R = 0.02, TUBE_R = 0.0065, LEG_TOP = BODY_H / 2 + 0.012;

export const PADLOCK = {
  /** body size [w, h, d] (m); origin is the body centre */
  body: [BODY_W, BODY_H, BODY_D] as [number, number, number],
  /** y (above body centre) of the inside of the shackle arc — where a hasp/staple bar rests when hanging */
  shackleInnerTop: LEG_TOP + ARC_R - TUBE_R,
  /** y of the outer top of the shackle */
  shackleTop: LEG_TOP + ARC_R + TUBE_R,
  /** y of the bottom of the body */
  bottomY: -BODY_H / 2,
  /** total height body+shackle */
  height: BODY_H + LEG_TOP + ARC_R + TUBE_R - BODY_H / 2,
  /** front face z */
  frontZ: BODY_D / 2,
};

/** U-shaped shackle path, parameterised by arc length. Left leg long (stays in the body when open), right leg short. */
class ShackleCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private leftBot: number, private rightBot: number, private top: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const L1 = this.top - this.leftBot, A = Math.PI * this.r, L2 = this.top - this.rightBot;
    let s = t * (L1 + A + L2);
    if (s < L1) return target.set(-this.r, this.leftBot + s, 0);
    s -= L1;
    if (s < A) {
      const a = Math.PI - s / this.r;
      return target.set(this.r * Math.cos(a), this.top + this.r * Math.sin(a), 0);
    }
    s -= A;
    return target.set(this.r, this.top - s, 0);
  }
}

let padGeo: null | {
  body: THREE.BufferGeometry; shackle: THREE.BufferGeometry; escut: THREE.BufferGeometry; hole: THREE.BufferGeometry;
  slot: THREE.BufferGeometry; stub: THREE.BufferGeometry; crack: THREE.BufferGeometry; chip: THREE.BufferGeometry;
  band: THREE.BufferGeometry;
} = null;
const padlockGeo = () => {
  if (padGeo) return padGeo;
  const shackle = new THREE.TubeGeometry(new ShackleCurve(ARC_R, -0.012, BODY_H / 2 - 0.009, LEG_TOP), 48, TUBE_R, 12, false);
  const escut = new THREE.CylinderGeometry(0.0115, 0.0125, 0.003, 28);
  escut.rotateX(Math.PI / 2);
  const hole = new THREE.CircleGeometry(0.0042, 20);
  const slotS = new THREE.Shape();
  slotS.moveTo(-0.0018, 0.001);
  slotS.lineTo(0.0018, 0.001);
  slotS.lineTo(0.0029, -0.0095);
  slotS.lineTo(-0.0029, -0.0095);
  slotS.closePath();
  const slot = new THREE.ShapeGeometry(slotS);
  const stub = new THREE.CylinderGeometry(TUBE_R, TUBE_R, 0.012, 12);
  // jagged crack strip from top-right edge towards the keyhole
  const pts: [number, number][] = [[0.03, 0.029], [0.021, 0.02], [0.025, 0.012], [0.014, 0.006], [0.017, -0.003], [0.008, -0.008]];
  const cs = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? cs.lineTo(x, y) : cs.moveTo(x, y)));
  for (let i = pts.length - 1; i >= 0; i--) cs.lineTo(pts[i][0] + 0.0018 * (1 - i / pts.length), pts[i][1] + 0.0014);
  cs.closePath();
  const crack = new THREE.ShapeGeometry(cs);
  const chip = new THREE.TetrahedronGeometry(0.006, 0);
  // slim darker band around the bottom of the body (laminated-steel feel)
  const band = new RoundedBoxGeometry(BODY_W + 0.0016, 0.008, BODY_D + 0.0016, 2, 0.004);
  padGeo = {body: rbox(BODY_W, BODY_H, BODY_D, 0.01, 4), shackle, escut, hole, slot, stub, crack, chip, band};
  return padGeo;
};

export type PadlockProps = GroupProps & {
  /** 0 closed .. 1 shackle up & swung open */
  open?: number;
  /** 0..1 rattle amplitude */
  shake?: number;
  /** 0..1 shackle snapped off, body cracked */
  broken?: number;
  /** seconds for the shake phase (defaults to current frame / fps) */
  time?: number;
  /** body colour (default alertRed) */
  color?: string;
  /** outline thickness override */
  outline?: number;
};

export const Padlock: React.FC<PadlockProps> = ({open = 0, shake = 0, broken = 0, time, color = C.alertRed, outline = PROP_INK.mid, ...rest}) => {
  const t = usePropTime(time);
  const g = padlockGeo();
  const bodyMat = glossMat(color, {spec: 0.4, edge: 0.972, rim: 0.06, rimColor: '#ffd0d0'});
  const bandMat = glossMat(new THREE.Color(color).multiplyScalar(0.62).getStyle(), {spec: 0.4});
  const chrome = chromeMat();
  const ink = flatMat('#140a14');

  // shake: deterministic rattle
  const sk = clamp01(shake);
  const rz = sk * 0.2 * Math.sin(t * 52) * (0.65 + 0.35 * Math.sin(t * 11.3));
  const rx = sk * 0.08 * Math.sin(t * 37 + 1.3);
  const px = sk * 0.0035 * Math.sin(t * 61 + 0.4);
  const rattle = sk * 0.0025 * Math.abs(Math.sin(t * 70));

  // open: lift then swing about the long (left) leg
  const o = clamp01(open);
  const lift = 0.016 * smooth01(o / 0.6);
  const swing = 1.25 * smooth01((o - 0.55) / 0.45);

  // broken: shackle flies, body tilts
  const b = clamp01(broken);
  const fly = easeOutCubic(b);
  const shX = 0.035 * fly, shY = 0.085 * b - 0.06 * b * b, shRz = -2.2 * fly, shRx = 0.7 * fly;
  const bodyTilt = 0.18 * smooth01(b * 1.5);

  return (
    <group {...rest}>
      <group rotation={[rx, 0, rz + bodyTilt]} position={[px, 0, 0]}>
        {/* body */}
        <Ink geometry={g.body} material={bodyMat} outline={outline} />
        <mesh geometry={g.band} material={bandMat} position={[0, -BODY_H / 2 + 0.0075, 0]} />
        {/* keyhole on a chrome escutcheon */}
        <Ink geometry={g.escut} material={chrome} position={[0, -0.004, BODY_D / 2 + 0.0008]} outline={PROP_INK.hair} />
        <mesh geometry={g.hole} material={ink} position={[0, -0.0015, BODY_D / 2 + 0.0026]} />
        <mesh geometry={g.slot} material={ink} position={[0, -0.0015, BODY_D / 2 + 0.0026]} />
        {/* crack */}
        {b > 0.02 ? (
          <mesh geometry={g.crack} material={ink} position={[0, 0, BODY_D / 2 + 0.0007]} scale={Math.min(1, b * 3)} />
        ) : null}
        {/* shackle */}
        {b > 0.001 ? (
          <>
            <Ink geometry={g.stub} material={chrome} position={[ARC_R, BODY_H / 2 + 0.002, 0]} outline={PROP_INK.thin} />
            <group position={[shX, shY, 0.004 * fly]} rotation={[shRx, 0, shRz]}>
              <Ink geometry={g.shackle} material={chrome} outline={outline * 0.8} />
            </group>
            {[0, 1, 2, 3].map((i) => {
              const a = 0.6 + i * 0.9;
              const d = 0.05 * fly;
              const vis = b < 0.98 ? 1 : 0;
              return (
                <mesh
                  key={i}
                  geometry={g.chip}
                  material={i % 2 ? chrome : bodyMat}
                  position={[0.02 + Math.cos(a) * d, 0.03 + Math.sin(a) * d * 0.8 + 0.04 * b - 0.07 * b * b, 0.012 + 0.02 * fly]}
                  rotation={[b * 7 + i, b * 5, b * 3 * i]}
                  scale={vis * (1 - b * 0.6) * (0.6 + 0.2 * i)}
                />
              );
            })}
          </>
        ) : (
          <group position={[-ARC_R, lift + rattle, 0]} rotation={[0, swing, 0]}>
            <Ink geometry={g.shackle} material={chrome} position={[ARC_R, 0, 0]} outline={outline * 0.8} />
          </group>
        )}
      </group>
    </group>
  );
};

export default Padlock;
