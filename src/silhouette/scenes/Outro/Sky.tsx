// TERMS · Outro — the dawn sky (a local variant of the Final's painted sky so the colours carry across the cut): a dim
// warm upper sky, a gold-ash middle, a hot gold band on the horizon, thin cloud strata, and the low sun with a corona and
// faint crepuscular rays. The sun sits dead centre behind the house in the wide, so the cube eclipses it and its corona
// burns round the roof line. Only greys and dawnGold (DESIGN-silhouette §2.2). Its halo breathes on the beat.
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {S, GREYS} from '../../lib/palette';
import {beatAt, clamp01} from '../../../lib/time';

type GroupProps = Omit<React.ComponentProps<'group'>, 'children'>;

/** hex mix (fog colours take strings) */
export const mixHex = (a: string, b: string, k: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getHexString()}`;

/** the warm dawn haze (same recipe as the Final's fogAt() at full dawn, so the cut matches) */
export const dawnHaze = (warm = 0.3, gain = 0.85) => mixHex(S.void, mixHex(S.ash, S.dawnGold, warm), gain);

/** gold rim for the figures lit from behind by the low sun / the doorway (thin: strength ≤ 0.6, power ≥ 6) */
export const goldRim = (strength = 0.4, dir: [number, number] = [0, 1]) => ({color: S.dawnGold, strength, power: 7, dir});

const VERT = /* glsl */ `
uniform vec2 uSize;
uniform float uOffY;
varying vec2 vP;
void main() {
  vP = vec2(position.x * uSize.x, position.y * uSize.y + uOffY);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uTop, uMid, uBand, uSunCol, uGlowCol;
uniform float uBandH, uMidH, uSunR, uGlowR, uCloud, uTime, uHorizon, uRays;
uniform vec2 uSun;
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
  vec3 col = mix(uTop, uMid, exp(-yy / uMidH));
  col = mix(col, uBand, exp(-yy / uBandH));
  vec2 d = vP - uSun;
  float r = length(d);
  // corona + a wide soft glow + the horizontal flare along the horizon
  col += uGlowCol * (exp(-r / uGlowR) + 0.55 * exp(-r / (uGlowR * 0.22)));
  col += uGlowCol * 0.45 * exp(-abs(y) / (uBandH * 0.9)) * exp(-abs(d.x) / (uGlowR * 5.0));
  // crepuscular rays: slow angular streaks fanning out of the sun (seam-free: noise on the unit circle)
  float a = atan(d.y, d.x);
  vec2 cs = vec2(cos(a), sin(a));
  float rays = vn(cs * 7.0 + vec2(uTime * 0.015, 3.1)) * vn(cs * 17.0 + vec2(1.7, uTime * 0.01));
  rays = smoothstep(0.12, 0.55, rays);
  col += uGlowCol * uRays * rays * exp(-r / (uGlowR * 2.6)) * smoothstep(uSunR * 1.5, uSunR * 5.0, r) * step(0.0, y + uBandH * 0.3);
  // the disc
  float disc = (1.0 - smoothstep(uSunR * 0.96, uSunR, r)) * smoothstep(-0.002 * uSunR, 0.02 * uSunR, y);
  col = mix(col, uSunCol, disc);
  // thin cloud strata in the lower sky (darker lines drifting across)
  float sx = vP.x / (uBandH * 40.0);
  float st = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float yc = uBandH * (0.9 + 1.6 * fk + 0.3 * sin(fk * 3.1));
    float th = uBandH * (0.10 + 0.07 * fk);
    float band = exp(-pow((y - yc) / th, 2.0));
    float n = vn(vec2(sx * (1.5 + fk) + uTime * 0.02 * (1.0 + fk), fk * 7.3));
    st += band * smoothstep(0.35, 0.8, n);
  }
  col *= 1.0 - uCloud * clamp(st, 0.0, 1.0) * 0.5;
  col += (h1(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type OutroSkyProps = GroupProps & {
  /** song seconds */
  t: number;
  /** distance from the camera to the card (m): converts degrees into card metres */
  distance: number;
  /** camera height (m): the true horizon sits at this height on the card */
  eye?: number;
  size?: [number, number];
  /** sun elevation (deg above the horizon) and azimuth offset on the card (m) */
  sunElev: number;
  sunX?: number;
  /** sun radius (deg) */
  sunDeg?: number;
  /** horizon band height (deg) */
  bandDeg?: number;
  /** overall gold gain, glow gain, ray strength */
  gain?: number;
  glow?: number;
  rays?: number;
  cloud?: number;
};

const PLANE = new THREE.PlaneGeometry(1, 1);

/** <OutroSky> — vertical sky card. Origin = ground level under its centre; faces +Z. Opaque, fog-free; only the sun blooms. */
export const OutroSky: React.FC<OutroSkyProps> = ({
  t, distance, eye = 1, size = [9000, 2600], sunElev, sunX = 0, sunDeg = 0.55, bandDeg = 2.4, gain = 1, glow = 1, rays = 0.18,
  cloud = 1, ...group
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: {value: new THREE.Color()}, uMid: {value: new THREE.Color()}, uBand: {value: new THREE.Color()},
          uSunCol: {value: new THREE.Color()}, uGlowCol: {value: new THREE.Color()},
          uBandH: {value: 10}, uMidH: {value: 40}, uSunR: {value: 10}, uGlowR: {value: 60}, uCloud: {value: 1}, uTime: {value: 0},
          uHorizon: {value: 0}, uRays: {value: 0}, uSun: {value: new THREE.Vector2()},
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
  // rhythm from light: the corona breathes on the beat (the band itself barely moves: no whole-frame flashes)
  const beat = beatAt(t, 6).pulse;
  const m = distance * (Math.PI / 180); // card metres per degree
  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uTop.value.set(GREYS.g1).lerp(new THREE.Color(S.dawnGold), 0.05);
    u.uMid.value.set(S.dawnGold).multiplyScalar(0.15 * gain);
    u.uBand.value.set(S.dawnGold).multiplyScalar(1.1 * gain * (1 + 0.03 * beat));
    u.uSunCol.value.set(S.dawnGold).multiplyScalar(3.4);
    u.uGlowCol.value.set(S.dawnGold).multiplyScalar(0.55 * gain * glow * (1 + 0.28 * beat));
    u.uBandH.value = bandDeg * m;
    u.uMidH.value = bandDeg * 2.6 * m;
    u.uSunR.value = sunDeg * m;
    u.uGlowR.value = 2.4 * m;
    u.uCloud.value = cloud;
    u.uTime.value = t;
    u.uHorizon.value = eye;
    u.uRays.value = rays;
    u.uSun.value.set(sunX, eye + sunElev * m);
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
