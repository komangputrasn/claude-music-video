// TERMS · Final — the dawn. A painted sky card (gold horizon band, dim warm sky above, cloud strata, a low sun that
// rises through them) that every shot puts far behind its subjects, plus colour helpers for the warm fog.
// Only greys, authRed (dying) and dawnGold are used (DESIGN-silhouette §2.2).
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {beatAt, clamp01, lerp} from '../../../lib/time';
import {dawn, sunElevation} from './timing';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

/** hex mix (for fog colours, which take strings) */
export const mixHex = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getHexString()}`;

/** the warm dawn haze colour at song time t (night ash → gold-ash) */
export const fogAt = (t: number, warm = 0.3, night: string = GREYS.g2, gain = 0.85) =>
  mixHex(night, mixHex(S.void, mixHex(S.ash, S.dawnGold, warm), gain), dawn(t));

const VERT = /* glsl */ `
uniform vec2 uSize;
uniform float uOffY;
varying vec2 vP;
void main() {
  // card-local metres, y = 0 at ground level
  vP = vec2(position.x * uSize.x, position.y * uSize.y + uOffY);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uTop, uMid, uBand, uSunCol, uGlowCol, uRed;
uniform float uBandH, uMidH, uSunR, uGlowR, uCloud, uTime, uHorizon;
uniform vec2 uSun, uRedAt;
varying vec2 vP;
float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), u.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  float y = vP.y - uHorizon;
  float yy = max(y, 0.0);
  // sky gradient: dim warm top → mid → bright gold band at the horizon
  vec3 col = mix(uTop, uMid, exp(-yy / uMidH));
  col = mix(col, uBand, exp(-yy / uBandH));
  // sun glow (wide, soft) + a horizontal flare along the horizon
  vec2 d = vP - uSun;
  float r = length(d);
  col += uGlowCol * exp(-r / uGlowR);
  col += uGlowCol * 0.55 * exp(-abs(y) / (uBandH * 0.9)) * exp(-abs(d.x) / (uGlowR * 5.0));
  // the disc (sinks behind the horizon line while below it)
  float disc = (1.0 - smoothstep(uSunR * 0.96, uSunR, r)) * smoothstep(-0.002 * uSunR, 0.02 * uSunR, y);
  col = mix(col, uSunCol, disc);
  // thin cloud strata drifting across the sun (darker lines), only in the lower sky
  float sx = vP.x / (uBandH * 40.0);
  float st = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float yc = uBandH * (0.6 + 1.25 * fk + 0.25 * sin(fk * 3.1));
    float th = uBandH * (0.10 + 0.07 * fk);
    float band = exp(-pow((y - yc) / th, 2.0));
    float n = vn(vec2(sx * (1.5 + fk) + uTime * 0.02 * (1.0 + fk), fk * 7.3));
    st += band * smoothstep(0.35, 0.8, n);
  }
  col *= 1.0 - uCloud * clamp(st, 0.0, 1.0) * 0.55;
  // night red haze (only in the first frames of the hit)
  col += uRed * exp(-length((vP - uRedAt) / vec2(uBandH * 30.0, uBandH * 6.0)));
  col += (h1(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type DawnSkyProps = GroupProps & {
  /** song seconds */
  t: number;
  /** distance from camera (m): used to convert the sun elevation (deg) into card metres */
  distance: number;
  /** camera height (m) above the ground: the true horizon sits at this height on the card */
  eye?: number;
  /** card size (m) */
  size?: [number, number];
  /** sun x on the card (m) */
  sunX?: number;
  /** sun radius as an angle (deg) */
  sunDeg?: number;
  /** override dawn amount (0..1) */
  k?: number;
  /** extra overall gain of the gold */
  gain?: number;
  /** band height as an angle (deg) */
  bandDeg?: number;
  /** red night haze 0..1 (first frames of the hit) */
  red?: number;
  /** multipliers: upper-sky warmth, mid-sky gold, mid gradient height */
  top?: number;
  mid?: number;
  midH?: number;
  /** sun elevation override (deg) */
  sunElev?: number;
  cloud?: number;
};

const PLANE = new THREE.PlaneGeometry(1, 1);

/**
 * <DawnSky> — a vertical sky card. Origin = ground level under the card's centre; it faces +Z. Put it ~1500–2500 m
 * behind the subjects (inside the camera far plane) facing the camera. Fog-free, opaque, under bloom except the sun.
 */
export const DawnSky: React.FC<DawnSkyProps> = ({
  t, distance, eye = 1, size = [9000, 2600], sunX = 0, sunDeg = 0.55, k: kIn, gain = 1, bandDeg = 1.6, red = 0, sunElev, cloud = 1,
  top = 1, mid = 1, midH = 1, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: {value: new THREE.Color()}, uMid: {value: new THREE.Color()}, uBand: {value: new THREE.Color()},
          uSunCol: {value: new THREE.Color()}, uGlowCol: {value: new THREE.Color()}, uRed: {value: new THREE.Color()},
          uBandH: {value: 10}, uMidH: {value: 40}, uSunR: {value: 10}, uGlowR: {value: 60}, uCloud: {value: 1}, uTime: {value: 0},
          uHorizon: {value: 0}, uSun: {value: new THREE.Vector2()}, uRedAt: {value: new THREE.Vector2()},
          uSize: {value: new THREE.Vector2(1, 1)}, uOffY: {value: 0},
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthWrite: true,
        fog: false,
      }),
    [],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  const k = kIn ?? dawn(t);
  // rhythm from light: the sun's halo breathes on the beat (the band barely moves: no whole-frame flashes)
  const beat = beatAt(t, 6).pulse;
  const rad = Math.PI / 180;
  const m = distance * rad; // metres per degree on the card
  useLayoutEffect(() => {
    const u = mat.uniforms;
    const g = gain;
    // night: near-black ash; dawn: dim warm grey top, gold-ash middle, hot gold band
    u.uTop.value.set(GREYS.g1).lerp(new THREE.Color(mixHex(GREYS.g1, S.dawnGold, 0.06 * top)), k);
    u.uMid.value.set(GREYS.g2).lerp(new THREE.Color(S.dawnGold).multiplyScalar(0.15 * g * mid), k);
    u.uBand.value.set(GREYS.g3).lerp(new THREE.Color(S.dawnGold).multiplyScalar(1.15 * g * (1 + 0.035 * beat)), k);
    u.uSunCol.value.set(S.dawnGold).multiplyScalar(lerp(0, 3.4, k));
    u.uGlowCol.value.set(S.dawnGold).multiplyScalar(0.6 * k * g * (1 + 0.3 * beat));
    u.uRed.value.set(S.authRed).multiplyScalar(0.1 * red);
    u.uBandH.value = bandDeg * m;
    u.uMidH.value = bandDeg * 2.6 * midH * m;
    u.uSunR.value = sunDeg * m;
    u.uGlowR.value = 2.4 * m;
    u.uCloud.value = cloud;
    u.uTime.value = t;
    u.uHorizon.value = eye;
    u.uSun.value.set(sunX, eye + (sunElev ?? sunElevation(t)) * m);
    u.uRedAt.value.set(0, eye + 2 * m);
    u.uSize.value.set(size[0], size[1]);
    u.uOffY.value = size[1] / 2 - size[1] * 0.12;
  });
  return (
    <group {...group}>
      <mesh geometry={PLANE} material={mat} scale={[size[0], size[1], 1]} position={[0, size[1] / 2 - size[1] * 0.12, 0]} renderOrder={-10} />
    </group>
  );
};

/** flat void ground (when a shot does not need the wet mirror) */
export const VoidGround: React.FC<{size?: number; color?: string}> = ({size = 6000, color = S.void}) => (
  <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial color={color} />
  </mesh>
);

/** gold rim for silhouettes lit by the low sun (thin: strength ≤ 0.6, power ≥ 6) */
export const goldRim = (t: number, dir: [number, number] = [0, 1], strength = 0.5) => ({
  color: S.dawnGold, strength: strength * dawn(t), power: 7, dir,
});
