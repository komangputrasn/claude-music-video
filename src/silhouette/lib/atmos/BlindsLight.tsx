/**
 * Slatted light from VERTICAL blinds (DESIGN-silhouette §2.3, V1Bedroom's key light): bars of light separated by the
 * soft shadows of the slats, inside the soft-edged projection of the window, with a red TENURE scanner band that can
 * slide across THROUGH the same slats.
 *
 * <BlindsLight> — the pattern projected on a wall (or floor). A decal plane facing +Z, ORIGIN AT ITS CENTRE; place it
 *   1–2 cm in front of the wall. On the floor: rotation={[-Math.PI/2, 0, -Math.PI/2]} makes the bars run along world
 *   +X (light travelling in X), rotation-x={-Math.PI/2} makes them run along Z. Additive, fog-free.
 *
 *   <BlindsLight width?={3.2} height?={2.4} slats?={9} gap?={0.42} angle?={0.12} softness?={0.14} offset?={0}
 *                edge?={0.18} color?={S.bone} intensity?={0.95} scan?={null} scanColor?={S.authRed}
 *                scanWidth?={0.14} scanIntensity?={1.6} time?={0} seed?={1} {...group}/>
 *
 *   slats      number of light bars across the width (one per gap between slats)
 *   gap        0..1 fraction of each period that is LIT (the opening between two slats); 0.42 = blinds half open
 *   angle      skew of the bars (rad): the light comes in from the side, so the bars lean (0 = vertical)
 *   softness   penumbra, fraction of a period (0.05 crisp … 0.3 very soft / far from the window)
 *   offset     slides the bars sideways, in periods (animate it slowly for a passing light source / swaying blinds)
 *   edge       soft border of the window projection (m)
 *   intensity  HDR multiplier; 0.95 keeps bone bars JUST under bloom (the wall is a big surface: don't bloom it).
 *   scan       null = off, else 0..1 position of the red scanner band across the width (animate 0 → 1).
 *              Inside the band the white light is REPLACED by red (a narrow switch, never a pink crossfade). The band
 *              passes through the same slats, plus a faint red spill on the slat shadows.
 *
 * <BlindShafts> — the same pattern as VOLUMETRIC shafts in the air. A ray-marched volume (28 jittered samples per
 *   pixel, one draw call): the window (local XY plane, centred on the origin) extruded along `direction` for `length`
 *   metres (measured along the window normal, local +Z). Every sample looks up the blinds pattern at the window point
 *   its light came through, so the bars, the red scan band and the soft window edge all carry into the air, softening
 *   and fading with distance. Reads from any angle (side-on = parallel sheets of light; looking toward the window =
 *   striped rays converging). Drawn from back faces: silhouettes standing inside stay pure black.
 *
 *   <BlindShafts width?={3.2} height?={2.4} slats?={9} gap?={0.42} angle?={0.12} softness?={0.14} offset?={0}
 *                direction?={[0.25, -0.3, 1]} length?={5} color?={S.bone} intensity?={0.5}
 *                scan?={null} scanColor?={S.authRed} scanWidth?={0.14} scanIntensity?={1.6}
 *                ground?={0} groundFade?={0.06} {...group}/>
 *
 *   Matching a BlindsLight to the shafts (same slats/gap/offset/scan): light paints the window's pattern MIRRORED.
 *     - on a wall the light hits: mirror the decal with scale-x={-1} (same angle), else the red band slides the
 *       opposite way on the wall to the air;
 *     - on the floor: turn the decal so its local +X runs along the window's local +X (window in a left wall,
 *       rotation-y={π/2} → floor rotation={[-π/2, 0, π/2]}), give the window angle 0 and the floor
 *       angle = atan(direction[0] / direction[2]) (the light's sideways drift). The playground's last shot does this.
 *   direction  local light direction (z must be > 0: into the room). Rotate the group to put the window on a wall,
 *              e.g. rotation-y={Math.PI/2} for a window in a left wall (local +Z → world +X).
 *   intensity  0.3–0.8 typical (the air glows much less than the wall). The optical depth saturates, so the brightest
 *              the air can get is color × intensity (keep bone ≤ ~0.8 near a silhouette: bloom veils black shapes grey).
 *   ground / groundFade  world floor height (default 0) and a short fade (m) above it: the light stops on the floor and
 *              the hull is flattened onto it (like <LightShaft>), so beams that slope into the floor are not cut by a
 *              hard dark edge. Floor not at 0? pass it (ground={-1e4} = no floor).
 *   End the volume at the opposite wall (length); a hull poking through a wall drops those rays (see below).
 *   Looking INTO the window: whatever you put outside (a Backlight) shows through the gaps and ADDS to the red shafts
 *   in front of it (white + red = pink). Keep the outside dim (Backlight ≤ ~0.4): the shafts alone already glow white.
 *   Put the origin on the ROOM side of the wall (the window cap must not sit behind an opaque surface: back faces
 *   hidden behind an occluder drop the whole ray).
 *
 * Usage (V1Bedroom: window on the left wall at x = −3, light falling onto the back wall)
 *   <BlindShafts position={[-3, 1.6, 0]} rotation-y={Math.PI / 2} direction={[0.3, -0.25, 1]} length={4} scan={s}/>
 *   <BlindsLight position={[0.5, 1.5, -2.99]} scale-x={-1} width={3.4} height={2.2} scan={s}/>     // mirrored: see above
 */
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S} from '../palette';
import {atmosNoise, GroupProps, V3} from './shared';

type BlindsCommon = {
  width?: number;
  height?: number;
  slats?: number;
  gap?: number;
  angle?: number;
  softness?: number;
  offset?: number;
  color?: string;
  intensity?: number;
  scan?: number | null;
  scanColor?: string;
  scanWidth?: number;
  scanIntensity?: number;
  seed?: number;
  renderOrder?: number;
};

export type BlindsLightProps = GroupProps & BlindsCommon & {edge?: number; time?: number};
export type BlindShaftsProps = GroupProps & BlindsCommon & {direction?: V3; length?: number; ground?: number; groundFade?: number};

/** GLSL: bar mask at window uv (0..1), with per-slat brightness variation; and the red scan band weight. */
const GLSL_BLINDS = /* glsl */ `
uniform vec2 uSize;
uniform float uSlats, uGap, uSkew, uSoft, uOffset, uSeed;
uniform float uScan, uScanW;
float blHash(float n) { return fract(sin(n * 91.3458 + uSeed * 7.13) * 47453.5453); }
float blindsMask(vec2 uv, float extraSoft) {
  float x = uv.x + (uv.y - 0.5) * uSkew * uSize.y / uSize.x;
  float q = x * uSlats + uOffset;
  float ph = fract(q);
  float id = floor(q);
  float dd = abs(ph - 0.5);
  float s = clamp(uSoft + extraSoft, 0.01, 0.5);
  float bar = 1.0 - smoothstep(uGap * 0.5 - s * 0.5, uGap * 0.5 + s * 0.5, dd);
  return bar * (0.82 + 0.18 * blHash(id));
}
float scanBand(vec2 uv) {
  if (uScan < -0.5) return 0.0;
  float x = uv.x + (uv.y - 0.5) * uSkew * uSize.y / uSize.x;
  float sd = (x - uScan) / max(uScanW, 1e-3);
  return exp(-sd * sd * 3.0);
}`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const WALL_FRAG = /* glsl */ `
uniform vec3 uColor, uScanColor;
uniform float uEdge, uTime;
uniform sampler2D uNoise;
varying vec2 vUv;
${GLSL_BLINDS}
void main() {
  vec2 m = (vUv - 0.5) * uSize;
  vec2 q = uSize * 0.5 - abs(m);
  float win = smoothstep(0.0, uEdge, q.x) * smoothstep(0.0, uEdge, q.y);
  float bars = blindsMask(vUv, 0.0);
  float n = texture2D(uNoise, m / 2.5 + vec2(uTime * 0.01, 0.0)).r;
  float grad = mix(1.0, 0.72, vUv.x) * mix(0.85, 1.12, n);
  float band = scanBand(vUv);
  // each point is lit RED or WHITE, never pink: a narrow switch inside the band, not a linear crossfade
  float isRed = smoothstep(0.28, 0.5, band);
  vec3 col = uColor * bars * grad * (1.0 - isRed)
           + uScanColor * (bars * 0.9 * isRed + 0.12 * band * (1.0 - bars)) * mix(1.0, grad, 0.5);
  gl_FragColor = vec4(col * win, 1.0);
}`;

const SHAFT_VERT = /* glsl */ `
uniform float uGround;
varying vec3 vLocal;
varying vec3 vCam;
varying vec4 vRowY;
void main() {
  vRowY = vec4(modelMatrix[0][1], modelMatrix[1][1], modelMatrix[2][1], modelMatrix[3][1]); // world y = dot(vRowY, vec4(p, 1))
  // flatten the hull onto the floor: back faces under the floor would be depth-rejected and drop whole rays
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y = max(wp.y, uGround + 0.003);
  mat4 inv = inverse(modelMatrix);
  vLocal = (inv * wp).xyz;
  vCam = (inv * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Ray-marched sheared box: the window (W×H, local XY at z = 0) extruded along uDir (uDir.z = 1) for uLen metres.
// In "unsheared" coords q = (p.x − d.x·p.z, p.y − d.y·p.z, p.z) the volume is an axis-aligned box, and q.xy is the
// window point the light at p came through — so every sample looks up the blinds pattern directly.
const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor, uScanColor, uDir;
uniform float uLen, uK, uGround, uGroundFade;
varying vec3 vLocal;
varying vec3 vCam;
varying vec4 vRowY;
${GLSL_BLINDS}
float bsHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 ro = vCam;
  vec3 rd = normalize(vLocal - ro);
  vec3 qo = vec3(ro.xy - uDir.xy * ro.z, ro.z);
  vec3 qd = vec3(rd.xy - uDir.xy * rd.z, rd.z);
  vec3 lo = vec3(-uSize * 0.5, 0.0), hi = vec3(uSize * 0.5, uLen);
  vec3 inv = 1.0 / (qd + vec3(1e-7));
  vec3 t0 = (lo - qo) * inv, t1 = (hi - qo) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  float tA = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
  float tB = min(min(tmax.x, tmax.y), tmax.z);
  if (tB <= tA) discard;
  const int N = 28;
  float dt = (tB - tA) / float(N);
  float j = bsHash(gl_FragCoord.xy);
  float accW = 0.0, accR = 0.0;
  for (int i = 0; i < N; i++) {
    float tt = tA + (float(i) + j) * dt;
    vec3 q = qo + qd * tt;
    float s = clamp(q.z / uLen, 0.0, 1.0);
    float wy = dot(vRowY, vec4(ro + rd * tt, 1.0));
    float gf = uGroundFade > 0.0 ? smoothstep(uGround, uGround + uGroundFade, wy) : step(uGround, wy);
    vec2 uv = q.xy / uSize + 0.5;
    vec2 m = uSize * 0.5 - abs(q.xy);
    float e = 0.04 + 0.35 * s;
    float win = smoothstep(0.0, e, m.x) * smoothstep(0.0, e, m.y);
    float bars = blindsMask(uv, s * 0.22);
    float along = smoothstep(0.0, 0.05, s) * pow(1.0 - s, 1.3);
    float band = scanBand(uv);
    float l = bars * win * along * gf;
    accW += (1.0 - band) * l;
    accR += band * l;
  }
  // each ray shows the light that dominates it, RED or WHITE (never pink): a ray that crosses only a little red
  // (e.g. side-on, through every sheet) stays white; optical depth saturates (1 - e^-x) so looking straight into
  // the beams can't run away into bloom
  float W = 1.0 - exp(-accW * dt * uK);
  float R = 1.0 - exp(-accR * dt * uK);
  float red = smoothstep(0.35, 0.5, accR / (accW + accR + 1e-6)); // decided on the raw light, not the saturated depths
  vec3 col = uColor * W * (1.0 - red) + uScanColor * R * red;
  gl_FragColor = vec4(col, 1.0);
}`;

const UNIT = new THREE.PlaneGeometry(1, 1);

const blindsUniforms = () => ({
  uSize: {value: new THREE.Vector2(3, 2)}, uSlats: {value: 9}, uGap: {value: 0.42}, uSkew: {value: 0}, uSoft: {value: 0.14},
  uOffset: {value: 0}, uSeed: {value: 1}, uScan: {value: -1}, uScanW: {value: 0.14}, uColor: {value: new THREE.Color()},
  uScanColor: {value: new THREE.Color()},
});

const setBlinds = (u: Record<string, THREE.IUniform>, p: Required<Omit<BlindsCommon, 'renderOrder' | 'scan'>> & {scan: number | null}) => {
  u.uSize.value.set(p.width, p.height);
  u.uSlats.value = p.slats;
  u.uGap.value = p.gap;
  u.uSkew.value = Math.tan(p.angle);
  u.uSoft.value = p.softness;
  u.uOffset.value = p.offset;
  u.uSeed.value = p.seed;
  u.uScan.value = p.scan == null ? -1 : p.scan;
  u.uScanW.value = p.scanWidth;
  u.uColor.value.set(p.color).multiplyScalar(p.intensity);
  u.uScanColor.value.set(p.scanColor).multiplyScalar(p.scanIntensity);
};

const additiveMat = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, ...extra});

export const BlindsLight: React.FC<BlindsLightProps> = ({
  width = 3.2, height = 2.4, slats = 9, gap = 0.42, angle = 0.12, softness = 0.14, offset = 0, edge = 0.18, color = S.bone, intensity = 0.95,
  scan = null, scanColor = S.authRed, scanWidth = 0.14, scanIntensity = 1.6, time = 0, seed = 1, renderOrder = 2, ...group
}) => {
  const mat = useMemo(
    () =>
      additiveMat(VERT, WALL_FRAG, {...blindsUniforms(), uEdge: {value: 0.18}, uTime: {value: 0}, uNoise: {value: atmosNoise(1)}}, {
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    setBlinds(mat.uniforms, {width, height, slats, gap, angle, softness, offset, color, intensity, scan, scanColor, scanWidth, scanIntensity, seed});
    mat.uniforms.uEdge.value = edge;
    mat.uniforms.uTime.value = time;
  });
  return (
    <group {...group}>
      <mesh geometry={UNIT} material={mat} scale={[width, height, 1]} renderOrder={renderOrder} />
    </group>
  );
};

export const BlindShafts: React.FC<BlindShaftsProps> = ({
  width = 3.2, height = 2.4, slats = 9, gap = 0.42, angle = 0.12, softness = 0.14, offset = 0, direction = [0.25, -0.3, 1], length = 5,
  color = S.bone, intensity = 0.5, scan = null, scanColor = S.authRed, scanWidth = 0.14, scanIntensity = 1.6, seed = 1,
  ground = 0, groundFade = 0.06, renderOrder = 5, ...group
}) => {
  const [dx, dy] = [direction[0] / Math.max(0.05, Math.abs(direction[2])), direction[1] / Math.max(0.05, Math.abs(direction[2]))];
  const geo = useMemo(() => {
    // sheared hull box: window at z = 0, extruded along (dx, dy, 1) for `length` m (slightly padded)
    // subdivided along the length so flattening the hull onto the floor (vertex shader) follows the true bottom face
    const g = new THREE.BoxGeometry(width * 1.04 + 0.02, height * 1.04 + 0.02, length + 0.02, 1, 1, 32);
    g.translate(0, 0, length / 2);
    const P = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) {
      const z = Math.max(0, P.getZ(i));
      P.setXYZ(i, P.getX(i) + dx * z, P.getY(i) + dy * z, z);
    }
    P.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  }, [width, height, length, dx, dy]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  const mat = useMemo(
    () =>
      additiveMat(SHAFT_VERT, SHAFT_FRAG, {...blindsUniforms(), uDir: {value: new THREE.Vector3(0, 0, 1)}, uLen: {value: 5}, uK: {value: 0.5},
        uGround: {value: 0}, uGroundFade: {value: 0.06}}, {
        side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useLayoutEffect(() => {
    setBlinds(mat.uniforms, {width, height, slats, gap, angle, softness, offset, color, intensity, scan, scanColor, scanWidth, scanIntensity, seed});
    mat.uniforms.uDir.value.set(dx, dy, 1);
    mat.uniforms.uLen.value = length;
    mat.uniforms.uK.value = 1.1;
    mat.uniforms.uGround.value = ground;
    mat.uniforms.uGroundFade.value = groundFade;
  });
  return (
    <group {...group}>
      <mesh geometry={geo} material={mat} renderOrder={renderOrder} frustumCulled={false} visible={intensity > 0} />
    </group>
  );
};
